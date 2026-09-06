import {
  getSupabase
} from "../../_lib/supabase.js";

import {
  getSession,
  unauthorized
} from "../../_lib/session.js";

const DIRECTORY_ACCESS_ROLES = [
  "1538324425546666114", // Founder
  "1538505102644740167", // Chronarch Overseer
  "1543383003445723159"  // Executive Division
];

async function canViewDirectory(
  session,
  env
) {
  if (
    !env.DISCORD_BOT_TOKEN ||
    !env.DISCORD_GUILD_ID
  ) {
    return false;
  }

  try {
    const response =
      await fetch(
        `https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${session.id}`,
        {
          headers: {
            Authorization:
              `Bot ${env.DISCORD_BOT_TOKEN}`
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
      DIRECTORY_ACCESS_ROLES.includes(
        role
      )
    );

  } catch (error) {
    console.error(
      "Staff directory permission check failed:",
      error
    );

    return false;
  }
}

export async function onRequestGet(
  context
) {
  const session =
    await getSession(
      context.request,
      context.env
    );

  if (!session) {
    return unauthorized();
  }

  const allowed =
    await canViewDirectory(
      session,
      context.env
    );

  if (!allowed) {
    return Response.json(
      {
        success: false,
        error:
          "You do not have permission to view the Staff Directory."
      },
      {
        status: 403
      }
    );
  }

  try {
    const supabase =
      getSupabase(
        context.env
      );

    const {
      data,
      error
    } =
      await supabase
        .from("staff_members")
        .select(`
          discord_id,
          username,
          avatar,
          rank,
          first_login,
          last_login
        `)
        .order(
          "last_login",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      staff: data || []
    });

  } catch (error) {
    console.error(
      "Unable to load Staff Directory:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Unable to load Staff Directory."
      },
      {
        status: 500
      }
    );
  }
}
