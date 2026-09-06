import supabase from "../../lib/database.js";

export default async function handler(req, res) {
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

  try {
    const { data: request, error: findError } = await supabase
      .from("requests")
      .select("id")
      .eq("id", request_id)
      .single();

    if (findError || !request) {
      return res.status(404).json({
        success: false,
        error: "Request not found"
      });
    }

    const { error: updateError } = await supabase
      .from("requests")
      .update({
        status,
        reviewed_by,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", request_id);

    if (updateError) {
      console.error(updateError);

      return res.status(500).json({
        success: false,
        error: "Failed to review request"
      });
    }

    return res.status(200).json({
      success: true,
      request_id,
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
