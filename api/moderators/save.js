import db from "../../lib/database.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const {
    id,
    username,
    avatar
  } = req.body || {};

  if (!id || !username) {
    return res.status(400).json({
      success: false,
      error: "Missing moderator information"
    });
  }

  const existing = db.prepare(`
    SELECT id
    FROM moderators
    WHERE id = ?
  `).get(id);

  if (existing) {
    db.prepare(`
      UPDATE moderators
      SET username = ?, avatar = ?
      WHERE id = ?
    `).run(username, avatar || null, id);
  } else {
    db.prepare(`
      INSERT INTO moderators (id, username, avatar)
      VALUES (?, ?, ?)
    `).run(id, username, avatar || null);
  }

  return res.status(200).json({
    success: true,
    moderator: {
      id,
      username,
      avatar: avatar || null
    }
  });
}
