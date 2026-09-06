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
      .from("schedule_events")
      .select(`
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        created_by,
        created_by_name,
        created_at
      `)
      .order(
        "event_date",
        {
          ascending: true
        }
      )
      .order(
        "start_time",
        {
          ascending: true
        }
      );

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      events: data || []
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to load schedule"
      },
      {
        status: 500
      }
    );
  }
}
