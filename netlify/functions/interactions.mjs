import nacl from "tweetnacl";
import { createClient } from "@supabase/supabase-js";

const REVIEW_ROLE_IDS = [
  "1538505102644740167",
  "1543383003445723159"
];

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(
      "Method not allowed",
      { status: 405 }
    );
  }

  const signature =
    req.headers.get(
      "x-signature-ed25519"
    );

  const timestamp =
    req.headers.get(
      "x-signature-timestamp"
    );

  const publicKey =
    process.env.DISCORD_PUBLIC_KEY;

  if (
    !signature ||
    !timestamp ||
    !publicKey
  ) {
    return new Response(
      "Invalid interaction",
      { status: 401 }
    );
  }

  const rawBody =
    await req.text();

  const valid =
    nacl.sign.detached.verify(
      Buffer.from(
        timestamp + rawBody
      ),

      Buffer.from(
        signature,
        "hex"
      ),

      Buffer.from(
        publicKey,
        "hex"
      )
    );

  if (!valid) {
    return new Response(
      "Invalid signature",
      { status: 401 }
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
    interaction.member?.user?.id;

  const reviewerRoles =
    interaction.member?.roles || [];

  const permitted =
    reviewerRoles.some(role =>
      REVIEW_ROLE_IDS.includes(role)
    );

  if (!permitted) {
    return Response.json({
      type: 4,

      data: {
        content:
          "Only Chronarch Overseer or Executive Division can review this action.",
        flags: 64
      }
    });
  }

  const customId =
    interaction.data?.custom_id;

  const [
    command,
    actionId
  ] = String(customId).split(":");

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
    createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

  const { data: action, error } =
    await supabase
      .from("mod_actions")
      .select("*")
      .eq("id", actionId)
      .single();

  if (error || !action) {
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

  const { error: updateError } =
    await supabase
      .from("mod_actions")
      .update({
        verification_status:
          status,

        verified_by:
          reviewerId,

        verified_at:
          new Date().toISOString()
      })
      .eq("id", actionId)
      .eq(
        "verification_status",
        "pending"
      );

  if (updateError) {
    console.error(updateError);

    return Response.json({
      type: 4,

      data: {
        content:
          "Unable to update the action.",
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
                ).replaceAll("_", " "),
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
                  : "❌ Denied • 0 points"
            },

            {
              name: "Reviewed By",
              value:
                `<@${reviewerId}>`
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
            new Date().toISOString()
        }
      ],

      components: []
    }
  });
}

export const config = {
  path: "/api/interactions"
};
