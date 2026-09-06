import {
  clearSessionCookie
} from "../../lib/session.js";

export default function handler(
  req,
  res
) {
  clearSessionCookie(res);

  return res.status(200).json({
    success: true
  });
}
