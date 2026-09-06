import db from "../../lib/database.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const actions = db.prepare(`
    SELECT
      id,
      moderator_id,
      moderator_name,
      action_type,
      target_user_id,
      target_user_name,
      reason,
      created_at
    FROM mod_actions
    ORDER BY created_at DESC
  `).all();

  return res.status(200).json({
    success: true,
    actions
  });
}
