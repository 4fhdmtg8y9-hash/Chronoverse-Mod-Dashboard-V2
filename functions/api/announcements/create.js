import {
  getSupabase
} from "../../_lib/supabase.js";

import {
  getSession,
  unauthorized
} from "../../_lib/session.js";

const ANNOUNCEMENT_ROLES = [
  "1538324425546666114",
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

  const {
    DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID
  } = context.env;

  if (
    !DISCORD_BOT_TOKEN ||
    !DISCORD_GUILD_ID
  ) {
    return Response.json(
      {
        success: false,
        error:
          "Discord configuration is missing"
      },
      {
        status: 500
      }
    );
  }

  try {
    const memberResponse =
      await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${session.id}`,
        {
          headers: {
            Authorization:
              `Bot ${DISCORD_BOT_TOKEN}`
          }
        }
      );

    if (!memberResponse.ok) {
      return Response.json(
        {
          success: false,
          error:
            "Unable to verify Discord roles"
        },
        {
          status: 403
        }
      );
    }

    const member =
      await memberResponse.json();

    const permitted =
      member.roles.some(role =>
        ANNOUNCEMENT_ROLES.includes(role)
      );

    if (!permitted) {
      return Response.json(
        {
          success: false,
          error:
            "Only Founder, Chronarch Overseer, and Executive Division can post announcements."
        },
        {
          status: 403
        }
      );
    }

    const body =
      await context.request.json();

    const title =
      String(
        body.title || ""
      ).trim();

    const content =
      String(
        body.content || ""
      ).trim();

    if (!title || !content) {
      return Response.json(
        {
          success: false,
          error:
            "Title and message are required"
        },
        {
          status: 400
        }
      );
    }

    if (title.length > 100) {
      return Response.json(
        {
          success: false,
          error:
            "Announcement title is too long"
        },
        {
          status: 400
        }
      );
    }

    if (content.length > 2000) {
      return Response.json(
        {
          success: false,
          error:
            "Announcement message is too long"
        },
        {
          status: 400
        }
      );
    }

    const supabase =
      getSupabase(context.env);

    const {
      data,
      error
    } = await supabase
      .from("announcements")
      .insert({
        author_id:
          session.id,

        author_name:
          session.username,

        title,
        content
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return Response.json(
      {
        success: true,
        announcement: data
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
          "Unable to create announcement"
      },
      {
        status: 500
      }
    );
  }
}
