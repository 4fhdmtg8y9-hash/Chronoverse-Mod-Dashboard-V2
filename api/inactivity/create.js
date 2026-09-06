import db from "../../lib/database.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const {
    user_id,
    username,
    reason
  } = req.body || {};

  if (!user_id || !username || !reason) {
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
    "inactivity",
    user_id,
    username,
    reason
  );

  return res.status(201).json({
    success: true,
    request_id: result.lastInsertRowid
  });
}
