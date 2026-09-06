import nacl from "tweetnacl";

import {
  getSupabase
} from "../_lib/supabase.js";

const REVIEW_ROLE_IDS = [
  "1538505102644740167", // Chronarch Overseer
  "1543383003445723159"  // Executive Division
];

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0) {
    return null;
  }

  const bytes =
    new Uint8Array(
      hex.length / 2
    );

  for (
    let i = 0;
    i < hex.length;
    i += 2
  ) {
    bytes[i / 2] =
      parseInt(
        hex.slice(i, i + 2),
        16
      );
  }

  return bytes;
}

async function patchDiscordMessage(
  interaction,
  payload,
  botToken
) {
  const channelId =
    interaction.channel_id;

  const messageId =
    interaction.message?.id;

  if (
    !channelId ||
    !messageId ||
    !botToken
  ) {
    console.error(
      "Missing Discord message information"
    );

    return false;
  }

  const response =
    await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
      {
        method: "PATCH",

        headers: {
          Authorization:
            `Bot ${botToken}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(payload)
      }
    );

  if (!response.ok) {
    console.error(
      "Discord message update failed:",
      response.status,
      await response.text()
    );

    return false;
  }

  return true;
}

async function handleModerationAction(
  interaction,
  command,
  actionId,
  reviewerId,
  env
) {
  const supabase =
    getSupabase(env);

  const {
    data: action,
    error: actionError
  } = await supabase
    .from("mod_actions")
    .select("*")
    .eq("id", actionId)
    .single();

  if (
    actionError ||
    !action
  ) {
    console.error(
      actionError
    );

    return Response.json({
      type: 4,

      data: {
        content:
          "Moderation action not found.",
        flags: 64
      }
    });
  }

  if (
    action.verification_status !==
    "pending"
  ) {
    return Response.json({
      type: 4,

      data: {
        content:
          `This action is already ${action.verification_status}.`,
        flags: 64
      }
    });
  }

  const status =
    command === "verify_action"
      ? "approved"
      : "denied";

  const {
    error: updateError
  } = await supabase
    .from("mod_actions")
    .update({
      verification_status:
        status,

      verified_by:
        reviewerId,

      verified_at:
        new Date()
          .toISOString()
    })
    .eq("id", actionId)
    .eq(
      "verification_status",
      "pending"
    );

  if (updateError) {
    console.error(
      updateError
    );

    return Response.json({
      type: 4,

      data: {
        content:
          "Unable to update moderation action.",
        flags: 64
      }
    });
  }

  const approved =
    status === "approved";

  await patchDiscordMessage(
    interaction,
    {
      content: "",

      embeds: [
        {
          title:
            approved
              ? "✅ Moderation Action Verified"
              : "❌ Moderation Action Denied",

          description:
            approved
              ? "This moderation action has been approved."
              : "This moderation action has been denied.",

          fields: [
            {
              name:
                "Moderator",

              value:
                `${action.moderator_name}\n<@${action.moderator_id}>`,

              inline:
                true
            },

            {
              name:
                "Action",

              value:
                String(
                  action.action_type
                ).replaceAll(
                  "_",
                  " "
                ),

              inline:
                true
            },

            {
              name:
                "Target",

              value:
                action.target_user_name ||
                action.target_user_id ||
                "Not provided"
            },

            {
              name:
                "Reason",

              value:
                action.reason ||
                "No reason provided."
            },

            {
              name:
                "Status",

              value:
                approved
                  ? "✅ Verified • +5 points"
                  : "❌ Denied • 0 points",

              inline:
                true
            },

            {
              name:
                "Reviewed By",

              value:
                `<@${reviewerId}>`,

              inline:
                true
            }
          ],

          image:
            action.evidence_url
              ? {
                  url:
                    action.evidence_url
                }
              : undefined,

          footer: {
            text:
              approved
                ? "5 leaderboard points awarded."
                : "No leaderboard points awarded."
          },

          timestamp:
            new Date()
              .toISOString()
        }
      ],

      components: []
    },
    env.DISCORD_BOT_TOKEN
  );

  return Response.json({
    type: 6
  });
}

async function handleInactivity(
  interaction,
  command,
  noticeId,
  reviewerId,
  env
) {
  const supabase =
    getSupabase(env);

  const {
    data: notice,
    error: noticeError
  } = await supabase
    .from("inactivity_notices")
    .select("*")
    .eq("id", noticeId)
    .single();

  if (
    noticeError ||
    !notice
  ) {
    console.error(
      noticeError
    );

    return Response.json({
      type: 4,

      data: {
        content:
          "Inactivity notice not found.",
        flags: 64
      }
    });
  }

  if (
    notice.status !== "pending"
  ) {
    return Response.json({
      type: 4,

      data: {
        content:
          `This inactivity notice is already ${notice.status}.`,
        flags: 64
      }
    });
  }

  const status =
    command ===
    "approve_inactivity"
      ? "approved"
      : "denied";

  const {
    error: updateError
  } = await supabase
    .from("inactivity_notices")
    .update({
      status,

      reviewed_by:
        reviewerId,

      reviewed_at:
        new Date()
          .toISOString()
    })
    .eq("id", noticeId)
    .eq(
      "status",
      "pending"
    );

  if (updateError) {
    console.error(
      updateError
    );

    return Response.json({
      type: 4,

      data: {
        content:
          "Unable to update inactivity notice.",
        flags: 64
      }
    });
  }

  const approved =
    status === "approved";

  await patchDiscordMessage(
    interaction,
    {
      content: "",

      embeds: [
        {
          title:
            approved
              ? "✅ Inactivity Notice Approved"
              : "❌ Inactivity Notice Denied",

          description:
            approved
              ? "This inactivity notice has been approved."
              : "This inactivity notice has been denied.",

          color:
            approved
              ? 5763719
              : 15548997,

          fields: [
            {
              name:
                "Staff Member",

              value:
                `${notice.username}\n<@${notice.user_id}>`,

              inline:
                true
            },

            {
              name:
                "Status",

              value:
                approved
                  ? "✅ Approved"
                  : "❌ Denied",

              inline:
                true
            },

            {
              name:
                "Reason",

              value:
                notice.reason ||
                "No reason provided."
            },

            {
              name:
                "Reviewed By",

              value:
                `<@${reviewerId}>`
            }
          ],

          footer: {
            text:
              "Marvel Chronoverse • Inactivity System"
          },

          timestamp:
            new Date()
              .toISOString()
        }
      ],

      components: []
    },
    env.DISCORD_BOT_TOKEN
  );

  return Response.json({
    type: 6
  });
}

export async function onRequestPost(
  context
) {
  const {
    request,
    env
  } = context;

  const signature =
    request.headers.get(
      "x-signature-ed25519"
    );

  const timestamp =
    request.headers.get(
      "x-signature-timestamp"
    );

  if (
    !signature ||
    !timestamp ||
    !env.DISCORD_PUBLIC_KEY
  ) {
    return new Response(
      "Missing signature",
      {
        status: 401
      }
    );
  }

  const rawBody =
    await request.text();

  try {
    const signatureBytes =
      hexToBytes(signature);

    const publicKeyBytes =
      hexToBytes(
        env.DISCORD_PUBLIC_KEY
      );

    if (
      !signatureBytes ||
      !publicKeyBytes
    ) {
      return new Response(
        "Invalid signature",
        {
          status: 401
        }
      );
    }

    const message =
      new TextEncoder()
        .encode(
          timestamp + rawBody
        );

    const valid =
      nacl.sign.detached.verify(
        message,
        signatureBytes,
        publicKeyBytes
      );

    if (!valid) {
      return new Response(
        "Invalid signature",
        {
          status: 401
        }
      );
    }

    const interaction =
      JSON.parse(rawBody);

    // Discord endpoint verification
    if (interaction.type === 1) {
      return Response.json({
        type: 1
      });
    }

    if (interaction.type !== 3) {
      return Response.json({
        type: 4,

        data: {
          content:
            "Unsupported interaction.",
          flags: 64
        }
      });
    }

    const reviewerId =
      interaction.member
        ?.user
        ?.id;

    const reviewerRoles =
      interaction.member
        ?.roles || [];

    if (!reviewerId) {
      return Response.json({
        type: 4,

        data: {
          content:
            "Unable to identify reviewer.",
          flags: 64
        }
      });
    }

    const allowed =
      reviewerRoles.some(
        role =>
          REVIEW_ROLE_IDS.includes(
            role
          )
      );

    if (!allowed) {
      return Response.json({
        type: 4,

        data: {
          content:
            "Only Chronarch Overseer or Executive Division can review this request.",
          flags: 64
        }
      });
    }

    const customId =
      interaction.data
        ?.custom_id || "";

    const [
      command,
      recordId
    ] =
      customId.split(":");

    if (!recordId) {
      return Response.json({
        type: 4,

        data: {
          content:
            "Invalid interaction.",
          flags: 64
        }
      });
    }

    // ======================================
    // MODERATION ACTIONS
    // ======================================

    if (
      [
        "verify_action",
        "deny_action"
      ].includes(command)
    ) {
      return handleModerationAction(
        interaction,
        command,
        recordId,
        reviewerId,
        env
      );
    }

    // ======================================
    // INACTIVITY NOTICES
    // ======================================

    if (
      [
        "approve_inactivity",
        "deny_inactivity"
      ].includes(command)
    ) {
      return handleInactivity(
        interaction,
        command,
        recordId,
        reviewerId,
        env
      );
    }

    return Response.json({
      type: 4,

      data: {
        content:
          "Unknown interaction.",
        flags: 64
      }
    });

  } catch (error) {
    console.error(
      "Interaction failure:",
      error
    );

    return new Response(
      "Interaction failed",
      {
        status: 500
      }
    );
  }
}
