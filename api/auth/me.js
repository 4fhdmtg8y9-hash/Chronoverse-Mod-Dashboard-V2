import {
  getSession
} from "../../lib/session.js";

export default function handler(
  req,
  res
) {
  const session =
    getSession(req);

  if (!session) {
    return res.status(401).json({
      success: false,
      authenticated: false
    });
  }

  return res.status(200).json({
    success: true,
    authenticated: true,

    user: {
      id: session.id,
      username:
        session.username,
      avatar:
        session.avatar || ""
    }
  });
}
