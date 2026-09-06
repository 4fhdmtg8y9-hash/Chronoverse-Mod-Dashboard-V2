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

    const reason =
      String(
        body.reason || ""
      ).trim();

    if (!reason) {
      return Response.json(
        {
          success: false,
          error:
            "Reason is required"
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
      .from("inactivity_notices")
      .insert({
        user_id:
          session.id,

        username:
          session.username,

        reason,

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
        notice: data
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
          "Unable to submit inactivity notice"
      },
      {
        status: 500
      }
    );
  }
}
