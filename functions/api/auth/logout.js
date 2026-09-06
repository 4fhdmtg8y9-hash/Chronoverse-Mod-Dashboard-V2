export async function onRequestPost() {
  return Response.json(
    {
      success: true
    },
    {
      headers: {
        "Set-Cookie":
          "chronoverse_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      }
    }
  );
}
