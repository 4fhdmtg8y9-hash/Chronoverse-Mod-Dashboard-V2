function getCookie(req, name) {
  const cookieHeader = req.headers.get("cookie") || "";

  const cookies = cookieHeader
    .split(";")
    .map(cookie => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = cookie.slice(0, separatorIndex);
    const value = cookie.slice(separatorIndex + 1);

    if (key === name) {
      return value;
    }
  }

  return null;
}

export default async function handler(req) {
  const session =
    getCookie(req, "chronoverse_session");

  if (!session) {
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
    const user = JSON.parse(
      Buffer.from(
        session,
        "base64url"
      ).toString("utf8")
    );

    if (!user.id || !user.username) {
      throw new Error("Invalid session");
    }

    return Response.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar || ""
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

export const config = {
  path: "/api/auth/me"
};
