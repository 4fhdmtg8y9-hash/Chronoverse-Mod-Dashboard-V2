import nacl from "tweetnacl";
import supabase from "../lib/database.js";

export const config = {
  api: {
    bodyParser: false
  }
};

const ALLOWED_ROLES = [
  "1538324425546666114",
  "1538505102644740167",
  "1543383003445723159",
  "1538626569831055390",
  "1538626890649174170",
  "1538534696483426365",
  "1538569564340879420",
  "1538569917471916083"
];

async function getRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send(
      "Method not allowed"
    );
  }

  const publicKey =
    process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey) {
    return res.status(500).send(
      "Discord public key missing"
    );
  }

  const signature =
    req.headers["x-signature-ed25519"];

  const timestamp =
    req.headers["x-signature-timestamp"];

  if (!signature || !timestamp) {
    return res.status(401).send(
      "Invalid Discord request"
    );
  }

  try {
    const rawBody =
      await getRawBody(req);

    const isVerified =
      nacl.sign.detached.verify(
        Buffer.from(
          timestamp +
          rawBody.toString()
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

    if (!isVerified) {
      return res.status(401).send(
        "Invalid request signature"
      );
    }

    const interaction =
      JSON.parse(
        rawBody.toString()
      );

    // Discord PING verification
    if (interaction.type === 1) {
      return res.status(200).json({
        type: 1
      });
    }

    if (interaction.type !== 3) {
      return res.status(200).json({
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

    if (!customId) {
      return res.status(400).send(
        "Missing custom ID"
      );
    }

    const reviewerId =
      interaction.member?.user?.id;

    const reviewerRoles =
      interaction.member?.roles || [];

    const allowed =
      reviewerRoles.some(role =>
        ALLOWED_ROLES.includes(role)
      );

    if (!allowed) {
      return res.status(200).json({
        type: 4,

        data: {
          content:
            "You do not have permission to review moderation actions.",
          flags: 64
        }
      });
    }

    const [
      command,
      actionId
    ] = customId.split(":");

    if (
      !actionId ||
      ![
        "verify_action",
        "deny_action"
      ].includes(command)
    ) {
      return res.status(200).json({
        type: 4,

        data: {
          content:
            "Unknown verification action.",
          flags: 64
        }
      });
    }

    const { data: action, error } =
      await supabase
        .from("mod_actions")
        .select("*")
        .eq("id", actionId)
        .single();

    if (error || !action) {
      return res.status(200).json({
        type: 4,

        data: {
          content:
            "That moderation action no longer exists.",
          flags: 64
        }
      });
    }

    if (
      action.verification_status !==
      "pending"
    ) {
      return res.status(200).json({
        type: 4,

        data: {
          content:
            `This action has already been ${action.verification_status}.`,
          flags: 64
        }
      });
    }

    const newStatus =
      command === "verify_action"
        ? "approved"
        : "denied";

    const { error: updateError } =
      await supabase
        .from("mod_actions")
        .update({
          verification_status:
            newStatus,

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

      return res.status(200).json({
        type: 4,

        data: {
          content:
            "Unable to review this action.",
          flags: 64
        }
      });
    }

    const approved =
      newStatus === "approved";

    return res.status(200).json({
      type: 7,

      data: {
        embeds: [
          {
            title:
              approved
                ? "Moderation Action Verified"
                : "Moderation Action Denied",

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
                    : "❌ Denied • 0 points"
              },
              {
                name: "Reviewed By",
                value:
                  `<@${reviewerId}>`
              }
            ],

            timestamp:
              new Date().toISOString()
          }
        ],

        components: []
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).send(
      "Interaction processing failed"
    );
  }
}
