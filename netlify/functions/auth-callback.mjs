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

function createSessionToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      username: user.username,
      avatar: user.avatar || ""
    })
  ).toString("base64url");

  return payload;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response(
      "Missing Discord authorization code.",
      { status: 400 }
    );
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !botToken ||
    !guildId
  ) {
    return new Response(
      "Discord configuration is missing.",
      { status: 500 }
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri
        })
      }
    );

    if (!tokenResponse.ok) {
      return new Response(
        "Discord authorization failed.",
        { status: 401 }
      );
    }

    const tokenData =
      await tokenResponse.json();

    const userResponse = await fetch(
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
        { status: 401 }
      );
    }

    const user =
      await userResponse.json();

    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`,
      {
        headers: {
          Authorization:
            `Bot ${botToken}`
        }
      }
    );

    if (!memberResponse.ok) {
      return new Response(
        "You must be a member of the Chronoverse server.",
        { status: 403 }
      );
    }

    const member =
      await memberResponse.json();

    const allowed =
      member.roles.some(role =>
        ALLOWED_ROLES.includes(role)
      );

    if (!allowed) {
      return new Response(
        "You do not have permission to access this dashboard.",
        { status: 403 }
      );
    }

    const avatar = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : "";

    const session =
      createSessionToken({
        id: user.id,
        username: user.username,
        avatar
      });

    return new Response(null, {
      status: 302,

      headers: {
        Location: "/dashboard.html",

        "Set-Cookie":
          `chronoverse_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
      }
    });

  } catch (error) {
    console.error(error);

    return new Response(
      "Discord authentication failed.",
      { status: 500 }
    );
  }
}

export const config = {
  path: "/api/auth/callback"
};
