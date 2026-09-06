export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const { user_id } = req.body || {};

  if (!user_id) {
    return res.status(400).json({
      success: false,
      error: "Missing Discord user ID."
    });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return res.status(500).json({
      success: false,
      error: "Discord server configuration is missing."
    });
  }

  try {
    const response = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${user_id}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      }
    );

    if (response.status === 404) {
      return res.status(403).json({
        success: false,
        member: false,
        error: "You are not a member of the Chronoverse server."
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: "Unable to verify Discord server membership."
      });
    }

    const member = await response.json();

    return res.status(200).json({
      success: true,
      member: true,
      user_id: member.user.id,
      username: member.user.username,
      roles: member.roles
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Discord membership check failed."
    });
  }
}
