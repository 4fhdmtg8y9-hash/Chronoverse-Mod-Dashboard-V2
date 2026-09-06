import db from "../../lib/database.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Moderator ID is required"
    });
  }

  const moderator = db.prepare(`
    SELECT
      id,
      username,
      avatar,
      joined_at
    FROM moderators
    WHERE id = ?
  `).get(id);

  if (!moderator) {
    return res.status(404).json({
      success: false,
      error: "Moderator not found"
    });
  }

  const stats = db.prepare(`
    SELECT
      COUNT(*) AS total_actions
    FROM mod_actions
    WHERE moderator_id = ?
  `).get(id);

  return res.status(200).json({
    success: true,
    moderator: {
      ...moderator,
      total_actions: stats.total_actions
    }
  });
}
