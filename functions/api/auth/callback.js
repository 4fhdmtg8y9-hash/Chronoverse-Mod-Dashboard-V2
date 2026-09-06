import {
  getSupabase
} from "../../_lib/supabase.js";

const STAFF_ROLES = [
  {
    id: "1538324425546666114",
    name: "FOUNDER",
    priority: 1
  },
  {
    id: "1538505102644740167",
    name: "CHRONARCH OVERSEER",
    priority: 2
  },
  {
    id: "1543383003445723159",
    name: "EXECUTIVE DIVISION",
    priority: 3
  },
  {
    id: "1538626569831055390",
    name: "NEXUS DIRECTOR",
    priority: 4
  },
  {
    id: "1538626890649174170",
    name: "ADMINISTRATOR",
    priority: 5
  },
  {
    id: "1538534696483426365",
    name: "LEAD MODERATOR",
    priority: 6
  },
  {
    id: "1538569564340879420",
    name: "SENIOR MODERATOR",
    priority: 7
  },
  {
    id: "1538569917471916083",
    name: "MODERATOR",
    priority: 8
  }
];

const ALLOWED_ROLES =
  STAFF_ROLES.map(
    role => role.id
  );

function getHighestRank(memberRoles) {
  const matches =
    STAFF_ROLES
      .filter(role =>
        memberRoles.includes(
          role.id
        )
      )
      .sort(
        (a, b) =>
          a.priority -
          b.priority
      );

  if (!matches.length) {
    return null;
  }

  return matches[0].name;
}

function base64urlEncode(str) {
  return btoa(
    unescape(
      encodeURIComponent(str)
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function signSession(
  payload,
  secret
) {
  const encoder =
    new TextEncoder();

  const key =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(
        signature
      )
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function onRequestGet(
  context
) {
  const requestUrl =
    new URL(
      context.request.url
    );

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  if (!code) {
    return new Response(
      "Missing Discord authorization code.",
      {
        status: 400
      }
    );
  }

  const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID,
    SESSION_SECRET
  } = context.env;

  if (
    !DISCORD_CLIENT_ID ||
    !DISCORD_CLIENT_SECRET ||
    !DISCORD_REDIRECT_URI ||
    !DISCORD_BOT_TOKEN ||
    !DISCORD_GUILD_ID ||
    !SESSION_SECRET
  ) {
    return new Response(
      "Discord configuration is missing.",
      {
        status: 500
      }
    );
  }

  try {

    // =====================================
    // EXCHANGE DISCORD AUTH CODE
    // =====================================

    const tokenResponse =
      await fetch(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          body:
            new URLSearchParams({
              client_id:
                DISCORD_CLIENT_ID,

              client_secret:
                DISCORD_CLIENT_SECRET,

              grant_type:
                "authorization_code",

              code,

              redirect_uri:
                DISCORD_REDIRECT_URI
            })
        }
      );

    if (!tokenResponse.ok) {
      return new Response(
        "Discord authorization failed.",
        {
          status: 401
        }
      );
    }

    const tokenData =
      await tokenResponse.json();

    // =====================================
    // GET DISCORD USER
    // =====================================

    const userResponse =
      await fetch(
        "https://discord.com/api/users/@me",
        {
          headers: {
            Authorization:
              `Bearer ${tokenData.access_token}`
          }
        }
      );

    if (!userResponse.ok) {
      return new Response(
        "Unable to retrieve Discord user.",
        {
          status: 401
        }
      );
    }

    const user =
      await userResponse.json();

    // =====================================
    // GET SERVER MEMBER + ROLES
    // =====================================

    const memberResponse =
      await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${user.id}`,
        {
          headers: {
            Authorization:
              `Bot ${DISCORD_BOT_TOKEN}`
          }
        }
      );

    if (!memberResponse.ok) {
      return new Response(
        "You must be a member of the Chronoverse server.",
        {
          status: 403
        }
      );
    }

    const member =
      await memberResponse.json();

    const memberRoles =
      member.roles || [];

    const allowed =
      memberRoles.some(
        role =>
          ALLOWED_ROLES.includes(
            role
          )
      );

    if (!allowed) {
      return new Response(
        "You do not have permission to access this dashboard.",
        {
          status: 403
        }
      );
    }

    // =====================================
    // DETERMINE HIGHEST STAFF RANK
    // =====================================

    const rank =
      getHighestRank(
        memberRoles
      );

    if (!rank) {
      return new Response(
        "Unable to determine your Chronoverse staff rank.",
        {
          status: 403
        }
      );
    }

    // =====================================
    // DISCORD AVATAR
    // =====================================

    const avatar =
      user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : "";

    // =====================================
    // SAVE STAFF MEMBER
    // =====================================

    try {
      const supabase =
        getSupabase(
          context.env
        );

      const now =
        new Date()
          .toISOString();

      const {
        error: staffError
      } =
        await supabase
          .from(
            "staff_members"
          )
          .upsert(
            {
              discord_id:
                user.id,

              username:
                user.username,

              avatar,

              rank,

              last_login:
                now
            },
            {
              onConflict:
                "discord_id"
            }
          );

      if (staffError) {
        console.error(
          "Staff directory update failed:",
          staffError
        );
      }

    } catch (staffError) {
      /*
        Don't break Discord login if
        Staff Directory tracking fails.
      */

      console.error(
        "Staff directory error:",
        staffError
      );
    }

    // =====================================
    // CREATE SESSION
    // =====================================

    const payload =
      base64urlEncode(
        JSON.stringify({
          id:
            user.id,

          username:
            user.username,

          avatar,

          rank,

          created_at:
            Date.now()
        })
      );

    const signature =
      await signSession(
        payload,
        SESSION_SECRET
      );

    const token =
      `${payload}.${signature}`;

    // =====================================
    // REDIRECT TO DASHBOARD
    // =====================================

    return new Response(
      null,
      {
        status: 302,

        headers: {
          Location:
            "/dashboard.html",

          "Set-Cookie":
            `chronoverse_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
        }
      }
    );

  } catch (error) {
    console.error(
      "Discord authentication error:",
      error
    );

    return new Response(
      "Discord authentication failed.",
      {
        status: 500
      }
    );
  }
}
