import db from "../../lib/database.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const {
    request_id,
    status,
    reviewed_by
  } = req.body || {};

  if (!request_id || !status || !reviewed_by) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields"
    });
  }

  if (!["approved", "denied"].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Status must be approved or denied"
    });
  }

  const request = db.prepare(`
    SELECT id
    FROM requests
    WHERE id = ?
  `).get(request_id);

  if (!request) {
    return res.status(404).json({
      success: false,
      error: "Request not found"
    });
  }

  db.prepare(`
    UPDATE requests
    SET
      status = ?,
      reviewed_by = ?,
      reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    status,
    reviewed_by,
    request_id
  );

  return res.status(200).json({
    success: true,
    request_id,
    status
  });
}
