import crypto from "crypto";

const COOKIE_NAME = "chronoverse_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is missing.");
  }

  return secret;
}

function encode(value) {
  return Buffer.from(value)
    .toString("base64url");
}

function decode(value) {
  return Buffer.from(
    value,
    "base64url"
  ).toString("utf8");
}

function sign(value) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

export function createSession(user) {
  const payload = encode(
    JSON.stringify({
      id: user.id,
      username: user.username,
      avatar: user.avatar || "",
      created_at: Date.now()
    })
  );

  const signature = sign(payload);

  return `${payload}.${signature}`;
}

export function verifySession(token) {
  if (!token) {
    return null;
  }

  const [payload, signature] =
    token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected =
    sign(payload);

  const providedBuffer =
    Buffer.from(signature);

  const expectedBuffer =
    Buffer.from(expected);

  if (
    providedBuffer.length !==
    expectedBuffer.length
  ) {
    return null;
  }

  const valid =
    crypto.timingSafeEqual(
      providedBuffer,
      expectedBuffer
    );

  if (!valid) {
    return null;
  }

  try {
    return JSON.parse(
      decode(payload)
    );
  } catch {
    return null;
  }
}

export function getSession(req) {
  const cookieHeader =
    req.headers.cookie || "";

  const cookies =
    Object.fromEntries(
      cookieHeader
        .split(";")
        .map(cookie => cookie.trim())
        .filter(Boolean)
        .map(cookie => {
          const index =
            cookie.indexOf("=");

          return [
            cookie.slice(0, index),
            cookie.slice(index + 1)
          ];
        })
    );

  return verifySession(
    cookies[COOKIE_NAME]
  );
}

export function setSessionCookie(
  res,
  user
) {
  const token =
    createSession(user);

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}
