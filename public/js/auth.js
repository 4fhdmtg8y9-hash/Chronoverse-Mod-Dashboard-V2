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
  addLogoutButton
);
