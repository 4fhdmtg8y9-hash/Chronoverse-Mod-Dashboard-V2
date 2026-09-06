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
      .from("schedule_events")
      .select("*")
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to load schedule"
      });
    }

    return res.status(200).json({
      success: true,
      events: data || []
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
