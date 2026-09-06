export default async function handler() {
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

export const config = {
  path: "/api/auth/logout"
};
