import db from "../../lib/database.js";

export default function handler(req, res) {
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

  const statement = db.prepare(`
    INSERT INTO mod_actions (
      moderator_id,
      moderator_name,
      action_type,
      target_user_id,
      target_user_name,
      reason
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = statement.run(
    moderator_id,
    moderator_name,
    action_type,
    target_user_id || null,
    target_user_name || null,
    reason || null
  );

  return res.status(201).json({
    success: true,
    action_id: result.lastInsertRowid
  });
}
