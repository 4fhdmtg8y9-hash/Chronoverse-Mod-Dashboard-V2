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

export default async function handler(req) {
  if (req.method !== "GET") {
    return Response.json(
      {
        success: false,
        error: "Method not allowed"
      },
      {
        status: 405
      }
    );
  }

  return Response.json({
    success: true,
    action_types: ACTION_TYPES
  });
}

export const config = {
  path: "/api/actions/types"
};
