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

window.logoutChronoverse =
  logoutChronoverse;
