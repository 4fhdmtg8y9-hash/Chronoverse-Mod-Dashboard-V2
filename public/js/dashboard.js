async function fetchJson(url) {
  const response =
    await fetch(url);

  const data =
    await response.json();

  if (response.status === 401) {
    window.location.replace("/");
    throw new Error("Not authenticated");
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Request failed: ${url}`
    );
  }

  return data;
}

async function loadDashboard() {
  try {
    const [
      me,
      myActions,
      requests,
      leaderboard
    ] = await Promise.all([
      fetchJson("/api/auth/me"),
      fetchJson("/api/actions/my-actions"),
      fetchJson("/api/requests/list"),
      fetchJson("/api/leaderboard")
    ]);

    const user =
      me.user;

    const actions =
      myActions.actions || [];

    const requestList =
      requests.requests || [];

    const rankings =
      leaderboard.leaderboard || [];

    document.getElementById(
      "my-actions"
    ).textContent =
      actions.length;

    document.getElementById(
      "pending-requests"
    ).textContent =
      requestList.filter(
        request =>
          request.status === "pending"
      ).length;

    const rankIndex =
      rankings.findIndex(
        moderator =>
          moderator.moderator_id ===
          user.id
      );

    document.getElementById(
      "my-rank"
    ).textContent =
      rankIndex === -1
        ? "—"
        : `#${rankIndex + 1}`;

    renderLeaderboard(rankings);

  } catch (error) {
    console.error(
      "Dashboard load failed:",
      error
    );

    const activity =
      document.getElementById(
        "activity"
      );

    if (activity) {
      activity.textContent =
        "Unable to load dashboard data.";
    }
  }
}

function renderLeaderboard(
  leaderboard
) {
  const activity =
    document.getElementById(
      "activity"
    );

  if (!leaderboard.length) {
    activity.textContent =
      "No verified moderation activity yet.";

    return;
  }

  activity.classList.remove(
    "empty"
  );

  activity.innerHTML =
    leaderboard
      .slice(0, 5)
      .map(
        (moderator, index) => `
          <div style="
            display:flex;
            justify-content:space-between;
            gap:15px;
            padding:13px 0;
            border-bottom:1px solid #252535;
          ">
            <span>
              #${index + 1}
              ${escapeHtml(
                moderator.moderator_name
              )}
            </span>

            <strong>
              ${Number(
                moderator.points || 0
              )} pts
            </strong>
          </div>
        `
      )
      .join("");
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
