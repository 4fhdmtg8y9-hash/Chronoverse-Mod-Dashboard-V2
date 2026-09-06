export default async function handler() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Discord OAuth is not configured."
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds"
  });

  return Response.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`,
    302
  );
}

export const config = {
  path: "/api/auth/login"
};
