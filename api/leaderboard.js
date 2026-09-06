```js
import supabase from "../lib/database.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { data, error } = await supabase
      .from("mod_actions")
      .select("moderator_id, moderator_name");

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Failed to load leaderboard"
      });
    }

    const moderators = {};

    for (const action of data || []) {
      if (!moderators[action.moderator_id]) {
        moderators[action.moderator_id] = {
          moderator_id: action.moderator_id,
          moderator_name: action.moderator_name,
          total_actions: 0,
          points: 0
        };
      }

      moderators[action.moderator_id].total_actions += 1;
      moderators[action.moderator_id].points += 5;
    }

    const leaderboard = Object.values(moderators)
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        return b.total_actions - a.total_actions;
      });

    return res.status(200).json({
      success: true,
      leaderboard
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
}
```
