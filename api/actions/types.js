const ACTION_TYPES = [
  "warn",
  "mute",
  "timeout",
  "kick",
  "ban",
  "unban",
  "delete_message",
  "note"
];

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  return res.status(200).json({
    success: true,
    action_types: ACTION_TYPES
  });
}
