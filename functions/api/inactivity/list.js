import {
  getSupabase
} from "../../_lib/supabase.js";

import {
  getSession,
  unauthorized
} from "../../_lib/session.js";

export async function onRequestGet(context) {
  const session =
    await getSession(
      context.request,
      context.env
    );

  if (!session) {
    return unauthorized();
  }

  try {
    const supabase =
      getSupabase(context.env);

    const {
      data,
      error
    } = await supabase
      .from("inactivity_notices")
      .select(`
        id,
        user_id,
        username,
        reason,
        status,
        reviewed_by,
        reviewed_at,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      notices: data || []
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to load inactivity notices"
      },
      {
        status: 500
      }
    );
  }
}
