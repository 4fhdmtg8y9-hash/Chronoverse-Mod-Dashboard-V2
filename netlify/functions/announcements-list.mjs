import { createClient } from "@supabase/supabase-js";

function getSession(req) {
  const header =
    req.headers.get("cookie") || "";

  const cookie =
    header
      .split(";")
      .map(x => x.trim())
      .find(x =>
        x.startsWith(
          "chronoverse_session="
        )
      );

  if (!cookie) return null;

  try {
    const value =
      cookie.slice(
        "chronoverse_session=".length
      );

    return JSON.parse(
      Buffer.from(
        value,
        "base64url"
      ).toString("utf8")
    );
  } catch {
    return null;
  }
}

export default async function handler(req) {
  const session =
    getSession(req);

  if (!session) {
    return Response.json(
      {
        success: false,
        error: "Not authenticated"
      },
      {
        status: 401
      }
    );
  }

  const supabase =
    createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

  const {
    data,
    error
  } = await supabase
    .from("announcements")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to load announcements"
      },
      {
        status: 500
      }
    );
  }

  return Response.json({
    success: true,
    announcements: data || []
  });
}

export const config = {
  path: "/api/announcements/list"
};
