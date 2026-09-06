import db from "../lib/database.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const leaderboard = db.prepare(`
    SELECT
      moderator_id,
      moderator_name,
      COUNT(*) AS total_actions
    FROM mod_actions
    GROUP BY moderator_id, moderator_name
    ORDER BY total_actions DESC
  `).all();

  return res.status(200).json({
    success: true,
    leaderboard
  });
}
