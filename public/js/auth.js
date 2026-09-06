const SENIOR_ACCESS_RANKS = [
  "FOUNDER",
  "CHRONARCH OVERSEER",
  "EXECUTIVE DIVISION"
];

async function logoutChronoverse() {
  try {
    await fetch(
      "/api/auth/logout",
      {
        method: "POST"
      }
    );
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );
  }

  window.location.replace("/");
}

function updateRankDisplay(user) {
  const roleElement =
    document.querySelector(
      ".user-role"
    );

  if (
    roleElement &&
    user?.rank
  ) {
    roleElement.textContent =
      user.rank;
  }
}

function updateRestrictedNavigation(user) {
  const rank =
    user?.rank || "";

  const hasSeniorAccess =
    SENIOR_ACCESS_RANKS.includes(
      rank
    );

  // =================================
  // INACTIVITY LOGS
  // =================================

  const inactivityLinks =
    document.querySelectorAll(
      'a[href="/requests.html"]'
    );

  inactivityLinks.forEach(link => {
    link.style.display =
      hasSeniorAccess
        ? ""
        : "none";
  });

  // =================================
  // STAFF DIRECTORY
  // =================================

  const nav =
    document.querySelector(
      ".nav"
    );

  if (!nav) {
    return;
  }

  let staffLink =
    nav.querySelector(
      'a[href="/staff.html"]'
    );

  // If user is allowed and the link
  // doesn't already exist, create it.
  if (
    hasSeniorAccess &&
    !staffLink
  ) {
    staffLink =
      document.createElement(
        "a"
      );

    staffLink.href =
      "/staff.html";

    staffLink.className =
      "nav-link";

    staffLink.innerHTML = `
      <span class="nav-icon">♚</span>
      Staff Directory
    `;

    // If we're actually on staff.html,
    // make the button active.
    if (
      window.location.pathname ===
      "/staff.html"
    ) {
      staffLink.classList.add(
        "active"
      );
    }

    nav.appendChild(
      staffLink
    );
  }

  // If user is NOT allowed,
  // hide any Staff Directory link.
  if (
    !hasSeniorAccess &&
    staffLink
  ) {
    staffLink.style.display =
      "none";
  }
}

async function loadChronoverseUser() {
  try {
    const response =
      await fetch(
        "/api/auth/me"
      );

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    if (!data.user) {
      return;
    }

    updateRankDisplay(
      data.user
    );

    updateRestrictedNavigation(
      data.user
    );

  } catch (error) {
    console.error(
      "User loading error:",
      error
    );
  }
}

function addLogoutButton() {
  const sidebar =
    document.querySelector(
      ".sidebar"
    );

  if (!sidebar) {
    return;
  }

  if (
    document.getElementById(
      "chrono-logout"
    )
  ) {
    return;
  }

  const container =
    document.createElement(
      "div"
    );

  container.style.marginTop =
    "18px";

  container.style.paddingTop =
    "14px";

  container.style.borderTop =
    "1px solid rgba(198, 154, 101, .18)";

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "chrono-logout";

  button.type =
    "button";

  button.textContent =
    "LOG OUT";

  button.style.width =
    "100%";

  button.style.padding =
    "10px 12px";

  button.style.borderRadius =
    "6px";

  button.style.border =
    "1px solid rgba(158, 63, 66, .3)";

  button.style.background =
    "rgba(255,255,255,.02)";

  button.style.color =
    "#9f8f87";

  button.style.fontFamily =
    "Cinzel, Georgia, serif";

  button.style.fontSize =
    "8px";

  button.style.letterSpacing =
    "1px";

  button.style.cursor =
    "pointer";

  button.addEventListener(
    "mouseenter",
    () => {
      button.style.color =
        "#ffffff";

      button.style.background =
        "rgba(126, 34, 39, .35)";
    }
  );

  button.addEventListener(
    "mouseleave",
    () => {
      button.style.color =
        "#9f8f87";

      button.style.background =
        "rgba(255,255,255,.02)";
    }
  );

  button.addEventListener(
    "click",
    logoutChronoverse
  );

  container.appendChild(
    button
  );

  const footer =
    sidebar.querySelector(
      ".sidebar-footer"
    );

  if (footer) {
    sidebar.insertBefore(
      container,
      footer
    );
  } else {
    sidebar.appendChild(
      container
    );
  }
}

window.logoutChronoverse =
  logoutChronoverse;

document.addEventListener(
  "DOMContentLoaded",
  () => {
    addLogoutButton();
    loadChronoverseUser();
  }
);
