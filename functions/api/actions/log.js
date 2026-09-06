import {
  getSupabase
} from "../../_lib/supabase.js";

import {
  getSession,
  unauthorized
} from "../../_lib/session.js";

const REVIEW_ROLE_IDS = [
  "1538505102644740167",
  "1543383003445723159"
];

export async function onRequestPost(context) {
  const session =
    await getSession(
      context.request,
      context.env
    );

  if (!session) {
    return unauthorized();
  }

  try {
    const supabase =
      getSupabase(context.env);

    const form =
      await context.request.formData();

    const actionType =
      String(
        form.get("action_type") || ""
      ).trim();

    const targetUserId =
      String(
        form.get("target_user_id") || ""
      ).trim();

    const targetUserName =
      String(
        form.get("target_user_name") || ""
      ).trim();

    const reason =
      String(
        form.get("reason") || ""
      ).trim();

    const evidence =
      form.get("evidence");

    if (!actionType) {
      return Response.json(
        {
          success: false,
          error: "Action type is required"
        },
        {
          status: 400
        }
      );
    }

    let evidenceUrl = null;

    if (
      evidence &&
      typeof evidence === "object" &&
      evidence.size > 0
    ) {
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif"
      ];

      if (
        !allowedTypes.includes(
          evidence.type
        )
      ) {
        return Response.json(
          {
            success: false,
            error:
              "Evidence must be PNG, JPG, WEBP or GIF."
          },
          {
            status: 400
          }
        );
      }

      if (
        evidence.size >
        4 * 1024 * 1024
      ) {
        return Response.json(
          {
            success: false,
            error:
              "Evidence must be smaller than 4 MB."
          },
          {
            status: 400
          }
        );
      }

      const extension =
        evidence.name
          ?.split(".")
          .pop()
          ?.replace(
            /[^a-zA-Z0-9]/g,
            ""
          ) || "png";

      const path =
        `${session.id}/${crypto.randomUUID()}.${extension}`;

      const upload =
        await supabase.storage
          .from("evidence")
          .upload(
            path,
            await evidence.arrayBuffer(),
            {
              contentType:
                evidence.type,

              upsert: false
            }
          );

      if (upload.error) {
        console.error(
          upload.error
        );

        return Response.json(
          {
            success: false,
            error:
              "Unable to upload evidence"
          },
          {
            status: 500
          }
        );
      }

      const publicResult =
        supabase.storage
          .from("evidence")
          .getPublicUrl(path);

      evidenceUrl =
        publicResult.data.publicUrl;
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

        action_type:
          actionType,

        target_user_id:
          targetUserId || null,

        target_user_name:
          targetUserName || null,

        reason:
          reason || null,

        evidence_url:
          evidenceUrl,

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
            "Unable to save moderation action"
        },
        {
          status: 500
        }
      );
    }

    const {
      DISCORD_BOT_TOKEN,
      DISCORD_REQUEST_CHANNEL_ID
    } = context.env;

    if (
      !DISCORD_BOT_TOKEN ||
      !DISCORD_REQUEST_CHANNEL_ID
    ) {
      return Response.json(
        {
          success: true,
          action_id: action.id,
          warning:
            "Action saved, but Discord logging is not configured."
        },
        {
          status: 201
        }
      );
    }

    const discordResponse =
      await fetch(
        `https://discord.com/api/v10/channels/${DISCORD_REQUEST_CHANNEL_ID}/messages`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bot ${DISCORD_BOT_TOKEN}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            content:
              `<@&${REVIEW_ROLE_IDS[0]}> <@&${REVIEW_ROLE_IDS[1]}>`,

            allowed_mentions: {
              parse: [],
              roles:
                REVIEW_ROLE_IDS
            },

            embeds: [
              {
                title:
                  "Moderation Action Verification",

                description:
                  "A moderation action is awaiting staff review.",

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
                      actionType.replaceAll(
                        "_",
                        " "
                      ),
                    inline: true
                  },

                  {
                    name: "Target",
                    value:
                      targetUserName ||
                      targetUserId ||
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

                image:
                  evidenceUrl
                    ? {
                        url:
                          evidenceUrl
                      }
                    : undefined,

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

    if (!discordResponse.ok) {
      console.error(
        await discordResponse.text()
      );

      return Response.json(
        {
          success: true,
          action_id: action.id,
          warning:
            "Action saved, but Discord embed failed."
        },
        {
          status: 201
        }
      );
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
