function base64urlDecode(value) {
  value = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (value.length % 4) {
    value += "=";
  }

  const decoded =
    atob(value);

  const bytes =
    Uint8Array.from(
      decoded,
      char =>
        char.charCodeAt(0)
    );

  return new TextDecoder().decode(bytes);
}

function getCookie(request, name) {
  const cookieHeader =
    request.headers.get("cookie") || "";

  const cookies =
    cookieHeader
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
      char =>
        char.charCodeAt(0)
    );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
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
        error: "Session configuration missing"
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

    return Response.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        avatar:
          user.avatar || ""
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
