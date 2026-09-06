import supabase from "../../lib/database.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const {
    title,
    description,
    event_date,
    start_time,
    end_time,
    created_by,
    created_by_name
  } = req.body || {};

  if (
    !title ||
    !event_date ||
    !created_by ||
    !created_by_name
  ) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields"
    });
  }

  try {
    const { data, error } = await supabase
      .from("schedule_events")
      .insert({
        title,
        description: description || null,
        event_date,
        start_time: start_time || null,
        end_time: end_time || null,
        created_by,
        created_by_name
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to create schedule event"
      });
    }

    return res.status(201).json({
      success: true,
      event: data
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
