import db from "../../lib/database.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const { moderator_id } = req.query;

  if (!moderator_id) {
    return res.status(400).json({
      success: false,
      error: "Moderator ID is required"
    });
  }

  const actions = db.prepare(`
    SELECT
      id,
      action_type,
      target_user_id,
      target_user_name,
      reason,
      created_at
    FROM mod_actions
    WHERE moderator_id = ?
    ORDER BY created_at DESC
  `).all(moderator_id);

  return res.status(200).json({
    success: true,
    actions
  });
}
