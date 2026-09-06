import db from "../../lib/database.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const {
    type,
    user_id,
    username,
    reason
  } = req.body || {};

  if (!type || !user_id || !username) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields"
    });
  }

  const result = db.prepare(`
    INSERT INTO requests (
      type,
      user_id,
      username,
      reason,
      status
    )
    VALUES (?, ?, ?, ?, 'pending')
  `).run(
    type,
    user_id,
    username,
    reason || null
  );

  return res.status(201).json({
    success: true,
    request_id: result.lastInsertRowid
  });
}
