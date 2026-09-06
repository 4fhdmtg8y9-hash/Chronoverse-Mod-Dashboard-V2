import {
  getSupabase
} from "../_lib/supabase.js";

export async function onRequestGet(context) {
  try {
    const supabase =
      getSupabase(context.env);

    const {
      data,
      error
    } = await supabase
      .from("mod_actions")
      .select(`
        moderator_id,
        moderator_name
      `)
      .eq(
        "verification_status",
        "approved"
      );

    if (error) {
      throw error;
    }

    const totals = {};

    for (const action of data || []) {
      if (
        !totals[
          action.moderator_id
        ]
      ) {
        totals[
          action.moderator_id
        ] = {
          moderator_id:
            action.moderator_id,

          moderator_name:
            action.moderator_name,

          verified_actions: 0,
          points: 0
        };
      }

      totals[
        action.moderator_id
      ].verified_actions += 1;

      totals[
        action.moderator_id
      ].points += 5;
    }

    const leaderboard =
      Object.values(totals)
        .sort(
          (a, b) =>
            b.points - a.points
        );

    return Response.json({
      success: true,
      leaderboard
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to load leaderboard"
      },
      {
        status: 500
      }
    );
  }
}
