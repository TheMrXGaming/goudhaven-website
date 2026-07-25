(() => {
  const config = window.GOUDHAVEN_CONFIG || {};
  const discordUrl = config.discordUrl || "#";
  const fivemUrl = config.fivemJoinUrl || "https://cfx.re/join/96oe6e";
  const tebexUrl = config.tebexUrl || "https://goud-haven.tebex.io/";
  const apvUrl = config.apvUrl || "#";

  document.querySelectorAll(".js-discord-link").forEach(link => {
    link.href = discordUrl;
    link.addEventListener("click", event => {
      if (!discordUrl || discordUrl === "#" || discordUrl.includes("JOUW-LINK")) {
        event.preventDefault();
        showToast("Vul eerst jouw Discord-link in via config.js");
      }
    });
  });

  document.querySelectorAll(".js-fivem-link").forEach(link => {
    link.href = fivemUrl;
  });

  document.querySelectorAll(".js-tebex-link").forEach(link => {
    link.href = tebexUrl;
  });

  document.querySelectorAll(".js-apv-link").forEach(link => {
    link.href = apvUrl;
  });

  const joinCode = document.querySelector("#join-code");
  if (joinCode) joinCode.textContent = config.fivemJoinCode || "cfx.re/join/96oe6e";

  const serverStatus = document.querySelector("#server-status-text");
  if (serverStatus) serverStatus.textContent = config.serverStatusText || "Server beschikbaar";

  const privacyLink = document.querySelector("#privacy-link");
  if (privacyLink) {
    privacyLink.href = config.privacyUrl || "#";
    privacyLink.addEventListener("click", event => {
      if (!config.privacyUrl || config.privacyUrl === "#") {
        event.preventDefault();
        showToast("Er is nog geen privacypagina gekoppeld.");
      }
    });
  }


  const year = document.querySelector("#current-year");
  if (year) year.textContent = new Date().getFullYear();

  const header = document.querySelector(".site-header");
  const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const menuButton = document.querySelector(".menu-button");
  const nav = document.querySelector(".main-nav");

  menuButton?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open");
    document.body.classList.toggle("menu-open", Boolean(open));
    menuButton.setAttribute("aria-expanded", String(Boolean(open)));
  });

  nav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      document.body.classList.remove("menu-open");
      menuButton?.setAttribute("aria-expanded", "false");
    });
  });

  function showToast(message) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__ghToastTimer);
    window.__ghToastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }
})();
