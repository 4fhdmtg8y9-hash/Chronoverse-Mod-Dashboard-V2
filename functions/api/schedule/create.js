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

    const title =
      String(
        body.title || ""
      ).trim();

    const description =
      String(
        body.description || ""
      ).trim();

    const eventDate =
      String(
        body.event_date || ""
      ).trim();

    const startTime =
      String(
        body.start_time || ""
      ).trim();

    const endTime =
      String(
        body.end_time || ""
      ).trim();

    if (!title || !eventDate) {
      return Response.json(
        {
          success: false,
          error:
            "Event title and date are required"
        },
        {
          status: 400
        }
      );
    }

    if (
      startTime &&
      endTime &&
      endTime <= startTime
    ) {
      return Response.json(
        {
          success: false,
          error:
            "End time must be after start time"
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
      .from("schedule_events")
      .insert({
        title,

        description:
          description || null,

        event_date:
          eventDate,

        start_time:
          startTime || null,

        end_time:
          endTime || null,

        created_by:
          session.id,

        created_by_name:
          session.username
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return Response.json(
      {
        success: true,
        event: data
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
          "Unable to create schedule event"
      },
      {
        status: 500
      }
    );
  }
}
