import supabase from "../../lib/database.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const {
    moderator_id,
    moderator_name,
    action_type,
    target_user_id,
    target_user_name,
    reason
  } = req.body || {};

  if (
    !moderator_id ||
    !moderator_name ||
    !action_type
  ) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields"
    });
  }

  try {
    const { data: action, error } = await supabase
      .from("mod_actions")
      .insert({
        moderator_id,
        moderator_name,
        action_type,
        target_user_id: target_user_id || null,
        target_user_name: target_user_name || null,
        reason: reason || null,
        verification_status: "pending"
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to record moderation action"
      });
    }

    const botToken =
      process.env.DISCORD_BOT_TOKEN;

    const channelId =
      process.env.DISCORD_REQUEST_CHANNEL_ID;

    if (!botToken || !channelId) {
      return res.status(201).json({
        success: true,
        warning:
          "Action saved, but Discord logging is not configured yet.",
        action
      });
    }

    const discordResponse = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",

        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          embeds: [
            {
              title: "Moderation Action Verification",

              description:
                "A moderator submitted an action for verification.",

              fields: [
                {
                  name: "Moderator",
                  value:
                    `${moderator_name}\n<@${moderator_id}>`,
                  inline: true
                },
                {
                  name: "Action",
                  value:
                    String(action_type)
                      .replaceAll("_", " "),
                  inline: true
                },
                {
                  name: "Target",
                  value:
                    target_user_name ||
                    target_user_id ||
                    "Not provided",
                  inline: false
                },
                {
                  name: "Reason",
                  value:
                    reason ||
                    "No reason provided.",
                  inline: false
                },
                {
                  name: "Status",
                  value: "⏳ Pending Verification",
                  inline: false
                }
              ],

              footer: {
                text:
                  "Approved actions award 5 leaderboard points."
              },

              timestamp:
                new Date().toISOString()
            }
          ],

          components: [
            {
              type: 1,

              components: [
                {
                  type: 2,
                  style: 3,
                  label: "Verify",
                  custom_id:
                    `verify_action:${action.id}`
                },
                {
                  type: 2,
                  style: 4,
                  label: "Deny",
                  custom_id:
                    `deny_action:${action.id}`
                }
              ]
            }
          ]
        })
      }
    );

    if (!discordResponse.ok) {
      const discordError =
        await discordResponse.text();

      console.error(
        "Discord message error:",
        discordError
      );

      return res.status(201).json({
        success: true,
        warning:
          "Action saved but Discord verification message failed.",
        action
      });
    }

    const discordMessage =
      await discordResponse.json();

    await supabase
      .from("mod_actions")
      .update({
        discord_message_id:
          discordMessage.id
      })
      .eq("id", action.id);

    return res.status(201).json({
      success: true,
      message:
        "Action submitted for verification.",
      action_id: action.id
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to submit moderation action"
    });
  }
}
