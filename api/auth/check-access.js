const ALLOWED_ROLES = [
  "1538324425546666114",
  "1538505102644740167",
  "1543383003445723159",
  "1538626569831055390",
  "1538626890649174170",
  "1538534696483426365",
  "1538569564340879420",
  "1538569917471916083"
];

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
      error: "Discord configuration is missing."
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
        authorized: false,
        error: "You are not a member of the Chronoverse server."
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: "Unable to check Discord roles."
      });
    }

    const member = await response.json();

    const matchedRoles = member.roles.filter(role =>
      ALLOWED_ROLES.includes(role)
    );

    if (matchedRoles.length === 0) {
      return res.status(403).json({
        success: false,
        authorized: false,
        error: "You do not have permission to access the moderator dashboard."
      });
    }

    return res.status(200).json({
      success: true,
      authorized: true,
      roles: matchedRoles
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Role verification failed."
    });
  }
}
