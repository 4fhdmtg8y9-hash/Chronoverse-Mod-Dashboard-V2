import supabase from "../../lib/database.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const {
    moderator_id,
    moderator_name,
    action_type,
    target_user_id,
    target_user_name,
    reason
  } = req.body || {};

  if (!moderator_id || !moderator_name || !action_type) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields"
    });
  }

  try {
    const { data, error } = await supabase
      .from("mod_actions")
      .insert({
        moderator_id,
        moderator_name,
        action_type,
        target_user_id: target_user_id || null,
        target_user_name: target_user_name || null,
        reason: reason || null
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to record moderation action"
      });
    }

    return res.status(201).json({
      success: true,
      action_id: data.id
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
