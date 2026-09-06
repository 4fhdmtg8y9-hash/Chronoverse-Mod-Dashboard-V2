import supabase from "../../lib/database.js";

export default async function handler(req, res) {
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

  try {
    const { data, error } = await supabase
      .from("requests")
      .insert({
        type,
        user_id,
        username,
        reason: reason || null,
        status: "pending"
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to create request"
      });
    }

    return res.status(201).json({
      success: true,
      request_id: data.id
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
