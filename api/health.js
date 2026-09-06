export default function handler(req, res) {
  res.status(200).json({
    success: true,
    message: "Chronoverse Dashboard API is online"
  });
}
