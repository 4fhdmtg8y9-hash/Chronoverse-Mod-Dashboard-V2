import supabase from "../../lib/database.js";
import { getSession } from "../../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const session = getSession(req);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: "You must be logged in"
    });
  }

  const {
    action_type,
    target_user_id,
    target_user_name,
    reason
  } = req.body || {};

  if (!action_type) {
    return res.status(400).json({
      success: false,
      error: "Action type is required"
    });
  }

  try {
    const { data: action, error } =
      await supabase
        .from("mod_actions")
        .insert({
          moderator_id: session.id,
          moderator_name: session.username,
          action_type,
          target_user_id:
            target_user_id || null,
          target_user_name:
            target_user_name || null,
          reason:
            reason || null,
          verification_status:
            "pending"
        })
        .select("*")
        .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error:
          "Failed to record moderation action"
      });
    }

    const botToken =
      process.env.DISCORD_BOT_TOKEN;

    const channelId =
      process.env.DISCORD_REQUEST_CHANNEL_ID;

    if (botToken && channelId) {
      const discordResponse =
        await fetch(
          `https://discord.com/api/v10/channels/${channelId}/messages`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bot ${botToken}`,

              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              embeds: [
                {
                  title:
                    "Moderation Action Verification",

                  fields: [
                    {
                      name: "Moderator",
                      value:
                        `${session.username}\n<@${session.id}>`,
                      inline: true
                    },

                    {
                      name: "Action",
                      value:
                        String(action_type)
                          .replaceAll(
                            "_",
                            " "
                          ),
                      inline: true
                    },

                    {
                      name: "Target",
                      value:
                        target_user_name ||
                        target_user_id ||
                        "Not provided"
                    },

                    {
                      name: "Reason",
                      value:
                        reason ||
                        "No reason provided."
                    },

                    {
                      name: "Status",
                      value:
                        "⏳ Pending Verification"
                    }
                  ],

                  footer: {
                    text:
                      "Verified actions award 5 points."
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

      if (discordResponse.ok) {
        const message =
          await discordResponse.json();

        await supabase
          .from("mod_actions")
          .update({
            discord_message_id:
              message.id
          })
          .eq("id", action.id);
      } else {
        console.error(
          "Discord log failed:",
          await discordResponse.text()
        );
      }
    }

    return res.status(201).json({
      success: true,
      action_id: action.id,
      message:
        "Action submitted for verification"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        "Unable to submit moderation action"
    });
  }
}
