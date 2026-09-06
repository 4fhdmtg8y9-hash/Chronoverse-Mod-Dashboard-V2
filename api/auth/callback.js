export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: "Missing Discord authorization code."
    });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).json({
      success: false,
      error: "Discord OAuth is not configured yet."
    });
  }

  try {
    const tokenResponse = await fetch(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
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
      return res.status(401).json({
        success: false,
        error: "Failed to exchange Discord authorization code."
      });
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    if (!userResponse.ok) {
      return res.status(401).json({
        success: false,
        error: "Failed to retrieve Discord user."
      });
    }

    const user = await userResponse.json();

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Discord authentication failed."
    });
  }
}
