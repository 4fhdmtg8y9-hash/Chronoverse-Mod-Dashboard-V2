```js
export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing Discord authorization code.");
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
    return res.status(500).send(
      "Discord configuration is missing."
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
      return res.status(401).send(
        "Discord authorization failed."
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
      return res.status(401).send(
        "Unable to retrieve Discord user."
      );
    }

    const user =
      await userResponse.json();

    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${user.id}`,
      {
        headers: {
          Authorization:
            `Bot ${botToken}`
        }
      }
    );

    if (memberResponse.status === 404) {
      return res.status(403).send(
        "You must be a member of the Chronoverse server."
      );
    }

    if (!memberResponse.ok) {
      return res.status(500).send(
        "Unable to verify server membership."
      );
    }

    const member =
      await memberResponse.json();

    const allowedRoles = [
      "1538324425546666114",
      "1538505102644740167",
      "1543383003445723159",
      "1538626569831055390",
      "1538626890649174170",
      "1538534696483426365",
      "1538569564340879420",
      "1538569917471916083"
    ];

    const hasAccess =
      member.roles.some(role =>
        allowedRoles.includes(role)
      );

    if (!hasAccess) {
      return res.status(403).send(
        "You do not have permission to access this dashboard."
      );
    }

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : "";

    const safeUser = {
      id: user.id,
      username: user.username,
      avatar: avatarUrl
    };

    const encodedUser =
      Buffer.from(
        JSON.stringify(safeUser)
      ).toString("base64url");

    return res.redirect(
      `/auth-success.html?user=${encodedUser}`
    );

  } catch (error) {
    console.error(error);

    return res.status(500).send(
      "Discord authentication failed."
    );
  }
}
```
