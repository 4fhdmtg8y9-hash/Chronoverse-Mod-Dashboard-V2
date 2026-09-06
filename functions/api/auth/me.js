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

function base64urlDecode(value) {
  value = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (value.length % 4) {
    value += "=";
  }

  const decoded = atob(value);

  const bytes = Uint8Array.from(
    decoded,
    char => char.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}

function getCookie(request, name) {
  const cookieHeader =
    request.headers.get("cookie") || "";

  const cookies = cookieHeader
    .split(";")
    .map(cookie => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const index =
      cookie.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key =
      cookie.slice(0, index);

    const value =
      cookie.slice(index + 1);

    if (key === name) {
      return value;
    }
  }

  return null;
}

async function verifySignature(
  payload,
  signature,
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
      ["verify"]
    );

  let base64 =
    signature
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  while (base64.length % 4) {
    base64 += "=";
  }

  const binary =
    atob(base64);

  const signatureBytes =
    Uint8Array.from(
      binary,
      char => char.charCodeAt(0)
    );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
}

async function getStaffRank(
  userId,
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
    return "CHRONOVERSE STAFF";
  }

  try {
    const response =
      await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`,
        {
          headers: {
            Authorization:
              `Bot ${DISCORD_BOT_TOKEN}`
          }
        }
      );

    if (!response.ok) {
      console.error(
        "Unable to fetch Discord member:",
        response.status
      );

      return "CHRONOVERSE STAFF";
    }

    const member =
      await response.json();

    const memberRoles =
      member.roles || [];

    const matches =
      STAFF_ROLES
        .filter(role =>
          memberRoles.includes(role.id)
        )
        .sort(
          (a, b) =>
            a.priority - b.priority
        );

    if (!matches.length) {
      return "CHRONOVERSE STAFF";
    }

    return matches[0].name;

  } catch (error) {
    console.error(
      "Rank lookup failed:",
      error
    );

    return "CHRONOVERSE STAFF";
  }
}

export async function onRequestGet(context) {
  const {
    SESSION_SECRET
  } = context.env;

  if (!SESSION_SECRET) {
    return Response.json(
      {
        success: false,
        authenticated: false,
        error:
          "Session configuration missing"
      },
      {
        status: 500
      }
    );
  }

  const token =
    getCookie(
      context.request,
      "chronoverse_session"
    );

  if (!token) {
    return Response.json(
      {
        success: false,
        authenticated: false
      },
      {
        status: 401
      }
    );
  }

  const [
    payload,
    signature
  ] = token.split(".");

  if (!payload || !signature) {
    return Response.json(
      {
        success: false,
        authenticated: false
      },
      {
        status: 401
      }
    );
  }

  try {
    const valid =
      await verifySignature(
        payload,
        signature,
        SESSION_SECRET
      );

    if (!valid) {
      return Response.json(
        {
          success: false,
          authenticated: false
        },
        {
          status: 401
        }
      );
    }

    const user =
      JSON.parse(
        base64urlDecode(payload)
      );

    if (
      !user.id ||
      !user.username
    ) {
      throw new Error(
        "Invalid session"
      );
    }

    const rank =
      await getStaffRank(
        user.id,
        context.env
      );

    return Response.json({
      success: true,
      authenticated: true,

      user: {
        id:
          user.id,

        username:
          user.username,

        avatar:
          user.avatar || "",

        rank
      }
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        authenticated: false
      },
      {
        status: 401
      }
    );
  }
}
