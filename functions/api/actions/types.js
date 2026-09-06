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

export async function onRequestGet() {
  return Response.json({
    success: true,
    action_types: ACTION_TYPES
  });
}
