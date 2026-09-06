import supabase from "../../lib/database.js";

export default async function handler(req, res) {
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

  try {
    const { data, error } = await supabase
      .from("moderators")
      .upsert(
        {
          id,
          username,
          avatar: avatar || null
        },
        {
          onConflict: "id"
        }
      )
      .select("id, username, avatar")
      .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to save moderator"
      });
    }

    return res.status(200).json({
      success: true,
      moderator: data
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
