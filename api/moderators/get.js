import supabase from "../../lib/database.js";

export default async function handler(req, res) {
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

  try {
    const { data: moderator, error: moderatorError } = await supabase
      .from("moderators")
      .select("id, username, avatar, joined_at")
      .eq("id", id)
      .single();

    if (moderatorError) {
      if (moderatorError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Moderator not found"
        });
      }

      console.error(moderatorError);

      return res.status(500).json({
        success: false,
        error: "Failed to load moderator"
      });
    }

    const { count, error: countError } = await supabase
      .from("mod_actions")
      .select("*", { count: "exact", head: true })
      .eq("moderator_id", id);

    if (countError) {
      console.error(countError);

      return res.status(500).json({
        success: false,
        error: "Failed to load moderator statistics"
      });
    }

    return res.status(200).json({
      success: true,
      moderator: {
        ...moderator,
        total_actions: count || 0
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
