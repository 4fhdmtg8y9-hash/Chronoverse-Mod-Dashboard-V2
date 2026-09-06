import db from "../../lib/database.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const requests = db.prepare(`
    SELECT
      id,
      type,
      user_id,
      username,
      reason,
      status,
      reviewed_by,
      reviewed_at,
      created_at
    FROM requests
    ORDER BY created_at DESC
  `).all();

  return res.status(200).json({
    success: true,
    requests
  });
}
