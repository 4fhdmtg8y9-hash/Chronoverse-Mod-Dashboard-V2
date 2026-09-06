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

async function updateDiscordMessage(
  interaction,
  action,
  status,
  reviewerId,
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

    return;
  }

  const approved =
    status === "approved";

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

        body: JSON.stringify({
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
                  name: "Moderator",

                  value:
                    `${action.moderator_name}\n<@${action.moderator_id}>`,

                  inline: true
                },

                {
                  name: "Action",

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
                  name: "Target",

                  value:
                    action.target_user_name ||
                    action.target_user_id ||
                    "Not provided"
                },

                {
                  name: "Reason",

                  value:
                    action.reason ||
                    "No reason provided."
                },

                {
                  name: "Status",

                  value:
                    approved
                      ? "✅ Verified • +5 points"
                      : "❌ Denied • 0 points",

                  inline: true
                },

                {
                  name: "Reviewed By",

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

          // Removes Verify / Deny buttons
          components: []
        })
      }
    );

  if (!response.ok) {
    console.error(
      "Discord message update failed:",
      response.status,
      await response.text()
    );
  }
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
            "Only Chronarch Overseer or Executive Division can review moderation actions.",
          flags: 64
        }
      });
    }

    const customId =
      interaction.data
        ?.custom_id || "";

    const [
      command,
      actionId
    ] =
      customId.split(":");

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
      .eq(
        "id",
        actionId
      )
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
      command ===
      "verify_action"
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
      .eq(
        "id",
        actionId
      )
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

    /*
      Instead of relying on Discord's
      interaction message-update response,
      directly PATCH the original Discord
      message using the bot.
    */

    await updateDiscordMessage(
      interaction,
      action,
      status,
      reviewerId,
      env.DISCORD_BOT_TOKEN
    );

    /*
      Tell Discord that the button
      interaction was handled.
    */

    return Response.json({
      type: 6
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
