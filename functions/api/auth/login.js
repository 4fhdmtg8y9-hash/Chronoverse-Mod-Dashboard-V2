export async function onRequestGet(context) {
  const {
    DISCORD_CLIENT_ID,
    DISCORD_REDIRECT_URI
  } = context.env;

  if (
    !DISCORD_CLIENT_ID ||
    !DISCORD_REDIRECT_URI
  ) {
    return Response.json(
      {
        success: false,
        error:
          "Discord OAuth is not configured."
      },
      {
        status: 500
      }
    );
  }

  const params =
    new URLSearchParams({
      client_id:
        DISCORD_CLIENT_ID,

      redirect_uri:
        DISCORD_REDIRECT_URI,

      response_type:
        "code",

      scope:
        "identify guilds"
    });

  return Response.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`,
    302
  );
}
