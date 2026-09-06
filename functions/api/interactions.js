import nacl from "tweetnacl";

import {
  getSupabase
} from "../_lib/supabase.js";

const REVIEW_ROLE_IDS = [
  "1538505102644740167",
  "1543383003445723159"
];

function hexToUint8Array(hex) {
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

export async function onRequestPost(context) {
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

  const publicKey =
    env.DISCORD_PUBLIC_KEY;

  if (
    !signature ||
    !timestamp ||
    !publicKey
  ) {
    return new Response(
      "Missing Discord signature",
      {
        status: 401
      }
    );
  }

  const rawBody =
    await request.text();

  try {
    const signatureBytes =
      hexToUint8Array(signature);

    const publicKeyBytes =
      hexToUint8Array(publicKey);

    if (
      !signatureBytes ||
      !publicKeyBytes
    ) {
      return new Response(
        "Invalid Discord signature",
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
        "Invalid Discord signature",
        {
          status: 401
        }
      );
    }

    const interaction =
      JSON.parse(rawBody);

    // Discord verification PING
    if (interaction.type === 1) {
      return Response.json({
        type: 1
      });
    }

    // Discord button/component interaction
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

    const customId =
      interaction.data?.custom_id;

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

    const permitted =
      reviewerRoles.some(role =>
        REVIEW_ROLE_IDS.includes(role)
      );

    if (!permitted) {
      return Response.json({
        type: 4,

        data: {
          content:
            "Only Chronarch Overseer or Executive Division can review moderation actions.",
          flags: 64
        }
      });
    }

    const [
      command,
      actionId
    ] =
      String(customId || "")
        .split(":");

    if (
      !actionId ||
      ![
        "verify_action",
        "deny_action"
      ].includes(command)
    ) {
      return Response.json({
        type: 4,

        data: {
          content:
            "Unknown moderation action.",
          flags: 64
        }
      });
    }

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
            "This moderation action could not be found.",
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
            "Unable to update this moderation action.",
          flags: 64
        }
      });
    }

    const approved =
      status === "approved";

    return Response.json({
      type: 7,

      data: {
        content: "",

        embeds: [
          {
            title:
              approved
                ? "✅ Moderation Action Verified"
                : "❌ Moderation Action Denied",

            description:
              approved
                ? "This action has been approved and leaderboard points have been awarded."
                : "This action has been denied. No leaderboard points were awarded.",

            fields: [
              {
                name:
                  "Moderator",

                value:
                  `${action.moderator_name}\n<@${action.moderator_id}>`,

                inline: true
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

                inline: true
              },

              {
                name:
                  "Target",

                value:
                  action.target_user_name ||
                  action.target_user_id ||
                  "Not provided",

                inline: false
              },

              {
                name:
                  "Reason",

                value:
                  action.reason ||
                  "No reason provided.",

                inline: false
              },

              {
                name:
                  "Status",

                value:
                  approved
                    ? "✅ Verified • +5 points"
                    : "❌ Denied • 0 points",

                inline: true
              },

              {
                name:
                  "Reviewed By",

                value:
                  `<@${reviewerId}>`,

                inline: true
              }
            ],

            image:
              action.evidence_url
                ? {
                    url:
                      action.evidence_url
                  }
                : undefined,

            timestamp:
              new Date()
                .toISOString()
          }
        ],

        components: []
      }
    });

  } catch (error) {
    console.error(
      "Interaction error:",
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
