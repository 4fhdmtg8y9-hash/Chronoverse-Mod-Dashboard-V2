import { createClient } from "@supabase/supabase-js";

const REVIEW_ROLE_IDS = [
  "1538505102644740167",
  "1543383003445723159"
];

function getCookie(req, name) {
  const header = req.headers.get("cookie") || "";

  for (const part of header.split(";")) {
    const cookie = part.trim();
    const index = cookie.indexOf("=");

    if (index === -1) continue;

    if (cookie.slice(0, index) === name) {
      return cookie.slice(index + 1);
    }
  }

  return null;
}

function getSession(req) {
  const value = getCookie(
    req,
    "chronoverse_session"
  );

  if (!value) return null;

  try {
    return JSON.parse(
      Buffer.from(
        value,
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
      { status: 405 }
    );
  }

  const session = getSession(req);

  if (!session) {
    return Response.json(
      {
        success: false,
        error: "You must be logged in"
      },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  try {
    const form = await req.formData();

    const actionType =
      form.get("action_type");

    const targetUserId =
      form.get("target_user_id");

    const targetUserName =
      form.get("target_user_name");

    const reason =
      form.get("reason");

    const evidence =
      form.get("evidence");

    if (!actionType) {
      return Response.json(
        {
          success: false,
          error: "Action type is required"
        },
        { status: 400 }
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

      if (!allowedTypes.includes(evidence.type)) {
        return Response.json(
          {
            success: false,
            error:
              "Evidence must be PNG, JPG, WEBP or GIF."
          },
          { status: 400 }
        );
      }

      if (evidence.size > 4 * 1024 * 1024) {
        return Response.json(
          {
            success: false,
            error:
              "Evidence must be smaller than 4 MB."
          },
          { status: 400 }
        );
      }

      const extension =
        evidence.name
          .split(".")
          .pop()
          ?.replace(/[^a-zA-Z0-9]/g, "")
          || "png";

      const path =
        `${session.id}/${Date.now()}.${extension}`;

      const buffer =
        Buffer.from(
          await evidence.arrayBuffer()
        );

      const { error: uploadError } =
        await supabase.storage
          .from("evidence")
          .upload(path, buffer, {
            contentType: evidence.type,
            upsert: false
          });

      if (uploadError) {
        console.error(uploadError);

        return Response.json(
          {
            success: false,
            error:
              "Unable to upload evidence"
          },
          { status: 500 }
        );
      }

      const { data: publicData } =
        supabase.storage
          .from("evidence")
          .getPublicUrl(path);

      evidenceUrl =
        publicData.publicUrl;
    }

    const { data: action, error } =
      await supabase
        .from("mod_actions")
        .insert({
          moderator_id:
            session.id,

          moderator_name:
            session.username,

          action_type:
            String(actionType),

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
            "Failed to save moderation action"
        },
        { status: 500 }
      );
    }

    const discordResponse =
      await fetch(
        `https://discord.com/api/v10/channels/${process.env.DISCORD_REQUEST_CHANNEL_ID}/messages`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bot ${process.env.DISCORD_BOT_TOKEN}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            content:
              `<@&${REVIEW_ROLE_IDS[0]}> <@&${REVIEW_ROLE_IDS[1]}>`,

            allowed_mentions: {
              parse: [],
              roles: REVIEW_ROLE_IDS
            },

            embeds: [
              {
                title:
                  "Moderation Action Verification",

                description:
                  "A moderation action is awaiting review.",

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
                      String(actionType)
                        .replaceAll("_", " "),
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
                        url: evidenceUrl
                      }
                    : undefined,

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

    if (!discordResponse.ok) {
      console.error(
        await discordResponse.text()
      );

      return Response.json(
        {
          success: true,
          warning:
            "Action saved, but Discord message failed.",
          action_id: action.id
        },
        { status: 201 }
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
        action_id: action.id,
        message:
          "Action submitted for verification."
      },
      { status: 201 }
    );

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to submit moderation action"
      },
      { status: 500 }
    );
  }
}

export const config = {
  path: "/api/actions/log"
};
