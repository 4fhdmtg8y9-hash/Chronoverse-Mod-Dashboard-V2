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
      .from("mod_actions")
      .select(`
        id,
        action_type,
        target_user_id,
        target_user_name,
        reason,
        evidence_url,
        verification_status,
        verified_by,
        verified_at,
        created_at
      `)
      .eq(
        "moderator_id",
        session.id
      )
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
      actions: data || []
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to load your actions"
      },
      {
        status: 500
      }
    );
  }
}
