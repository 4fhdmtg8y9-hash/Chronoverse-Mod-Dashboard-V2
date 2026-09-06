import supabase from "../../lib/database.js";
import { getSession } from "../../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const session =
    getSession(req);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: "You must be logged in"
    });
  }

  try {
    const { data, error } =
      await supabase
        .from("mod_actions")
        .select(`
          id,
          action_type,
          target_user_id,
          target_user_name,
          reason,
          verification_status,
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
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to load your actions"
      });
    }

    return res.status(200).json({
      success: true,
      actions: data || []
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
