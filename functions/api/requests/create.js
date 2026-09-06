import {
  getSupabase
} from "../../_lib/supabase.js";

import {
  getSession,
  unauthorized
} from "../../_lib/session.js";

export async function onRequestPost(context) {
  const session =
    await getSession(
      context.request,
      context.env
    );

  if (!session) {
    return unauthorized();
  }

  try {
    const body =
      await context.request.json();

    const type =
      String(body.type || "").trim();

    const reason =
      String(body.reason || "").trim();

    if (!type) {
      return Response.json(
        {
          success: false,
          error: "Request type is required"
        },
        {
          status: 400
        }
      );
    }

    const supabase =
      getSupabase(context.env);

    const {
      data,
      error
    } = await supabase
      .from("requests")
      .insert({
        type,

        user_id:
          session.id,

        username:
          session.username,

        reason:
          reason || null,

        status:
          "pending"
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return Response.json(
      {
        success: true,
        request: data
      },
      {
        status: 201
      }
    );

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to create request"
      },
      {
        status: 500
      }
    );
  }
}
