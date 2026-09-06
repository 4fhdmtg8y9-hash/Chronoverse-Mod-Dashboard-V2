function base64urlDecode(value) {
  value = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (value.length % 4) {
    value += "=";
  }

  const binary = atob(value);

  const bytes = Uint8Array.from(
    binary,
    char => char.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}

function getCookie(request, name) {
  const cookieHeader =
    request.headers.get("cookie") || "";

  const cookies = cookieHeader
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
      char => char.charCodeAt(0)
    );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
}

export async function getSession(
  request,
  env
) {
  if (!env.SESSION_SECRET) {
    return null;
  }

  const token =
    getCookie(
      request,
      "chronoverse_session"
    );

  if (!token) {
    return null;
  }

  const [
    payload,
    signature
  ] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  try {
    const valid =
      await verifySignature(
        payload,
        signature,
        env.SESSION_SECRET
      );

    if (!valid) {
      return null;
    }

    const user =
      JSON.parse(
        base64urlDecode(payload)
      );

    if (
      !user.id ||
      !user.username
    ) {
      return null;
    }

    return user;

  } catch (error) {
    console.error(
      "Session verification failed:",
      error
    );

    return null;
  }
}

export function unauthorized() {
  return Response.json(
    {
      success: false,
      error: "You must be logged in"
    },
    {
      status: 401
    }
  );
}
