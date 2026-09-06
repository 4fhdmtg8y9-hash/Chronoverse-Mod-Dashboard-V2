```js
const userId =
  localStorage.getItem("discord_user_id");

const username =
  localStorage.getItem("discord_username");

if (!userId || !username) {
  window.location.replace("/");
}

async function loadDashboard() {
  try {
    const [
      myActions,
      requests,
      leaderboard
    ] = await Promise.all([
      fetchJson(
        `/api/actions/my-actions?moderator_id=${encodeURIComponent(userId)}`
      ),
      fetchJson("/api/requests/list"),
      fetchJson("/api/leaderboard")
    ]);

    updateMyActions(myActions.actions || []);
    updatePendingRequests(requests.requests || []);
    updateRank(leaderboard.leaderboard || []);
    updateRecentActivity(leaderboard.leaderboard || []);

  } catch (error) {
    console.error("Dashboard load failed:", error);

    document.getElementById(
      "activity"
    ).textContent =
      "Unable to load dashboard data.";
  }
}

async function fetchJson(url) {
  const response = await fetch(url);

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Request failed: ${url}`
    );
  }

  return data;
}

function updateMyActions(actions) {
  const element =
    document.getElementById("my-actions");

  element.textContent =
    actions.length;
}

function updatePendingRequests(requests) {
  const pending =
    requests.filter(
      request =>
        request.status === "pending"
    );

  const element =
    document.getElementById(
      "pending-requests"
    );

  element.textContent =
    pending.length;
}

function updateRank(leaderboard) {
  const element =
    document.getElementById("my-rank");

  const index =
    leaderboard.findIndex(
      moderator =>
        moderator.moderator_id === userId
    );

  if (index === -1) {
    element.textContent = "—";
    return;
  }

  element.textContent =
    `#${index + 1}`;
}

function updateRecentActivity(leaderboard) {
  const activity =
    document.getElementById("activity");

  if (!leaderboard.length) {
    activity.textContent =
      "No moderation activity yet.";

    return;
  }

  activity.classList.remove("empty");

  activity.innerHTML =
    leaderboard
      .slice(0, 5)
      .map(
        (moderator, index) => `
          <div
            style="
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:15px;
              padding:13px 0;
              border-bottom:1px solid #252535;
            "
          >
            <span>
              #${index + 1}
              ${escapeHtml(
                moderator.moderator_name
              )}
            </span>

            <strong>
              ${Number(
                moderator.total_actions
              )} actions
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
```
