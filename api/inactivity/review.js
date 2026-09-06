import supabase from "../../lib/database.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const {
    notice_id,
    status,
    reviewed_by
  } = req.body || {};

  if (!notice_id || !status || !reviewed_by) {
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

  try {
    const { data: notice, error: findError } = await supabase
      .from("inactivity_notices")
      .select("id")
      .eq("id", notice_id)
      .single();

    if (findError || !notice) {
      return res.status(404).json({
        success: false,
        error: "Inactivity notice not found"
      });
    }

    const { error: updateError } = await supabase
      .from("inactivity_notices")
      .update({
        status,
        reviewed_by,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", notice_id);

    if (updateError) {
      console.error(updateError);

      return res.status(500).json({
        success: false,
        error: "Failed to review inactivity notice"
      });
    }

    return res.status(200).json({
      success: true,
      notice_id,
      status
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
