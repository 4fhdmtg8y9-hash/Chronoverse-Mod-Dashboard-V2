import { createClient } from "@supabase/supabase-js";

function getCookie(req, name) {
  const cookieHeader =
    req.headers.get("cookie") || "";

  const cookies = cookieHeader
    .split(";")
    .map(cookie => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const index = cookie.indexOf("=");

    if (index === -1) continue;

    const key = cookie.slice(0, index);
    const value = cookie.slice(index + 1);

    if (key === name) {
      return value;
    }
  }

  return null;
}

function getSession(req) {
  const session =
    getCookie(
      req,
      "chronoverse_session"
    );

  if (!session) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(
        session,
        "base64url"
      ).toString("utf8")
    );
  } catch {
    return null;
  }
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return Response.json(
      {
        success: false,
        error: "Method not allowed"
      },
      {
        status: 405
      }
    );
  }

  const session =
    getSession(req);

  if (!session) {
    return Response.json(
      {
        success: false,
        error: "You must be logged in"
      },
      {
        status: 401
      }
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      {
        success: false,
        error:
          "Supabase is not configured."
      },
      {
        status: 500
      }
    );
  }

  const supabase =
    createClient(
      supabaseUrl,
      supabaseKey
    );

  try {
    const body =
      await req.json();

    const {
      action_type,
      target_user_id,
      target_user_name,
      reason
    } = body;

    if (!action_type) {
      return Response.json(
        {
          success: false,
          error:
            "Action type is required"
        },
        {
          status: 400
        }
      );
    }

    const {
      data: action,
      error
    } = await supabase
      .from("mod_actions")
      .insert({
        moderator_id:
          session.id,

        moderator_name:
          session.username,

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

      return Response.json(
        {
          success: false,
          error:
            "Failed to save moderation action"
        },
        {
          status: 500
        }
      );
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
                    new Date()
                      .toISOString()
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
        const discordMessage =
          await discordResponse.json();

        await supabase
          .from("mod_actions")
          .update({
            discord_message_id:
              discordMessage.id
          })
          .eq(
            "id",
            action.id
          );
      } else {
        console.error(
          "Discord message failed:",
          await discordResponse.text()
        );
      }
    }

    return Response.json(
      {
        success: true,
        action_id:
          action.id,
        message:
          "Action submitted for verification."
      },
      {
        status: 201
      }
    );

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to submit moderation action"
      },
      {
        status: 500
      }
    );
  }
}

export const config = {
  path: "/api/actions/log"
};
