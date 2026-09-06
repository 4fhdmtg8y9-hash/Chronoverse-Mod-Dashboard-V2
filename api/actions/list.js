import supabase from "../../lib/database.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { data, error } = await supabase
      .from("mod_actions")
      .select(`
        id,
        moderator_id,
        moderator_name,
        action_type,
        target_user_id,
        target_user_name,
        reason,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to load moderation actions"
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
