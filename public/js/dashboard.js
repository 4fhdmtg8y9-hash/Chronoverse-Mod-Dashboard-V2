async function loadLeaderboard() {
  const response = await fetch("/api/leaderboard");

  if (!response.ok) {
    throw new Error("Failed to load leaderboard");
  }

  const data = await response.json();

  return data.leaderboard || [];
}

async function loadDashboard() {
  try {
    const leaderboard = await loadLeaderboard();

    const activity = document.getElementById("activity");

    if (!leaderboard.length) {
      activity.textContent = "No moderation activity yet.";
      return;
    }

    activity.innerHTML = leaderboard
      .slice(0, 5)
      .map((moderator, index) => `
        <div style="
          display:flex;
          justify-content:space-between;
          padding:12px 0;
          border-bottom:1px solid #252535;
        ">
          <span>#${index + 1} ${escapeHtml(moderator.moderator_name)}</span>
          <strong>${moderator.total_actions} actions</strong>
        </div>
      `)
      .join("");

  } catch (error) {
    console.error(error);

    document.getElementById("activity").textContent =
      "Unable to load moderation activity.";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadDashboard();
