export default function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      success: false,
      error: "Discord OAuth is not configured yet."
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds"
  });

  res.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`
  );
}
