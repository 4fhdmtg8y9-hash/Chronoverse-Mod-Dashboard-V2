import {
  getSupabase
} from "../../_lib/supabase.js";

import {
  getSession,
  unauthorized
} from "../../_lib/session.js";

const LOG_ACCESS_ROLES = [
  "1538324425546666114", // Founder
  "1538505102644740167", // Chronarch Overseer
  "1543383003445723159"  // Executive Division
];

async function canViewLogs(
  session,
  env
) {
  const {
    DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID
  } = env;

  if (
    !DISCORD_BOT_TOKEN ||
    !DISCORD_GUILD_ID
  ) {
    return false;
  }

  try {
    const response =
      await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${session.id}`,
        {
          headers: {
            Authorization:
              `Bot ${DISCORD_BOT_TOKEN}`
          }
        }
      );

    if (!response.ok) {
      return false;
    }

    const member =
      await response.json();

    return (
      member.roles || []
    ).some(role =>
      LOG_ACCESS_ROLES.includes(role)
    );

  } catch (error) {
    console.error(
      "Inactivity log permission check failed:",
      error
    );

    return false;
  }
}

export async function onRequestGet(context) {
  const session =
    await getSession(
      context.request,
      context.env
    );

  if (!session) {
    return unauthorized();
  }

  const permitted =
    await canViewLogs(
      session,
      context.env
    );

  if (!permitted) {
    return Response.json(
      {
        success: false,
        error:
          "You do not have permission to view inactivity logs."
      },
      {
        status: 403
      }
    );
  }

  try {
    const supabase =
      getSupabase(context.env);

    const {
      data,
      error
    } = await supabase
      .from("inactivity_notices")
      .select(`
        id,
        user_id,
        username,
        reason,
        status,
        reviewed_by,
        reviewed_at,
        created_at
      `)
      .in(
        "status",
        [
          "approved",
          "denied"
        ]
      )
      .order(
        "reviewed_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      logs: data || []
    });

  } catch (error) {
    console.error(
      "Unable to load inactivity logs:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Unable to load inactivity logs."
      },
      {
        status: 500
      }
    );
  }
}
