import supabase from "../../lib/database.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { data, error } = await supabase
      .from("announcements")
      .select(`
        id,
        author_id,
        author_name,
        title,
        content,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to load announcements"
      });
    }

    return res.status(200).json({
      success: true,
      announcements: data || []
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
