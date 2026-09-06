import supabase from "../../lib/database.js";

const ANNOUNCEMENT_ROLES = [
  "1538324425546666114",
  "1538505102644740167",
  "1543383003445723159"
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const {
    author_id,
    author_name,
    title,
    content
  } = req.body || {};

  if (
    !author_id ||
    !author_name ||
    !title ||
    !content
  ) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields"
    });
  }

  const botToken =
    process.env.DISCORD_BOT_TOKEN;

  const guildId =
    process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return res.status(500).json({
      success: false,
      error: "Discord configuration missing"
    });
  }

  try {
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${author_id}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      }
    );

    if (!memberResponse.ok) {
      return res.status(403).json({
        success: false,
        error: "Unable to verify your Discord roles"
      });
    }

    const member =
      await memberResponse.json();

    const allowed =
      member.roles.some(role =>
        ANNOUNCEMENT_ROLES.includes(role)
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error:
          "Only Founder, Chronarch Overseer, and Executive Division can post announcements."
      });
    }

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        author_id,
        author_name,
        title,
        content
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to create announcement"
      });
    }

    return res.status(201).json({
      success: true,
      announcement: data
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to create announcement"
    });
  }
}
