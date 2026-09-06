import { createClient } from "@supabase/supabase-js";

const ANNOUNCEMENT_ROLES = [
  "1538324425546666114",
  "1538505102644740167",
  "1543383003445723159"
];

function getSession(req) {
  const header =
    req.headers.get("cookie") || "";

  const cookie =
    header
      .split(";")
      .map(x => x.trim())
      .find(x =>
        x.startsWith(
          "chronoverse_session="
        )
      );

  if (!cookie) return null;

  try {
    return JSON.parse(
      Buffer.from(
        cookie.slice(
          "chronoverse_session=".length
        ),
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
      {
        status: 405
      }
    );
  }

  const session =
    getSession(req);

  if (!session) {
    return Response.json(
      {
        success: false,
        error: "Not authenticated"
      },
      {
        status: 401
      }
    );
  }

  const memberResponse =
    await fetch(
      `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${session.id}`,
      {
        headers: {
          Authorization:
            `Bot ${process.env.DISCORD_BOT_TOKEN}`
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

  const allowed =
    member.roles.some(role =>
      ANNOUNCEMENT_ROLES.includes(role)
    );

  if (!allowed) {
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
    await req.json();

  const title =
    String(body.title || "").trim();

  const content =
    String(body.content || "").trim();

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

  const supabase =
    createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

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
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to post announcement"
      },
      {
        status: 500
      }
    );
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
}

export const config = {
  path: "/api/announcements/create"
};
