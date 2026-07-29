const state = {
  data: null,
  query: "",
  activeChapter: "all",
  allExpanded: false
};

const els = {
  searchInput: document.getElementById("searchInput"),
  lawContainer: document.getElementById("lawContainer"),
  chapterNav: document.getElementById("chapterNav"),
  articleCount: document.getElementById("articleCount"),
  chapterCount: document.getElementById("chapterCount"),
  updatedDate: document.getElementById("updatedDate"),
  resultLabel: document.getElementById("resultLabel"),
  resultCount: document.getElementById("resultCount"),
  clearSearchButton: document.getElementById("clearSearchButton"),
  emptyClearButton: document.getElementById("emptyClearButton"),
  emptyState: document.getElementById("emptyState"),
  expandAllButton: document.getElementById("expandAllButton"),
  menuButton: document.getElementById("menuButton"),
  closeMenuButton: document.getElementById("closeMenuButton"),
  sidebar: document.getElementById("sidebar"),
  mobileOverlay: document.getElementById("mobileOverlay"),
  themeButton: document.getElementById("themeButton"),
  toast: document.getElementById("toast"),
  noticeContainer: document.getElementById("noticeContainer")
};

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value = "") {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlight(value, query) {
  const safe = escapeHtml(value);
  if (!query.trim()) return safe;

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (!terms.length) return safe;
  return safe.replace(new RegExp(`(${terms.join("|")})`, "gi"), "<mark>$1</mark>");
}

function getSearchText(article, chapter) {
  return normalize([
    article.number,
    article.title,
    article.description,
    article.notes,
    article.category,
    article.penalty?.jail,
    article.penalty?.fine,
    article.penalty?.points,
    ...(article.tags || []),
    chapter.title,
    chapter.description
  ].filter(Boolean).join(" "));
}

function getVisibleChapters() {
  const query = normalize(state.query.trim());

  return state.data.chapters
    .filter(chapter => state.activeChapter === "all" || chapter.id === state.activeChapter)
    .map(chapter => ({
      ...chapter,
      articles: chapter.articles.filter(article => !query || getSearchText(article, chapter).includes(query))
    }))
    .filter(chapter => chapter.articles.length > 0);
}

function formatPenalty(value, fallback = "Niet van toepassing") {
  return value && String(value).trim() ? value : fallback;
}

function renderNavigation() {
  const articleTotal = state.data.chapters.reduce((sum, chapter) => sum + chapter.articles.length, 0);

  els.chapterNav.innerHTML = `
    <button class="chapter-link ${state.activeChapter === "all" ? "active" : ""}" data-chapter="all">
      <span class="chapter-number">∞</span>
      <span>Alle artikelen</span>
    </button>
    ${state.data.chapters.map((chapter, index) => `
      <button class="chapter-link ${state.activeChapter === chapter.id ? "active" : ""}" data-chapter="${escapeHtml(chapter.id)}">
        <span class="chapter-number">${String(index + 1).padStart(2, "0")}</span>
        <span>${escapeHtml(chapter.title)}</span>
      </button>
    `).join("")}
  `;

  els.articleCount.textContent = articleTotal;
  els.chapterCount.textContent = state.data.chapters.length;
  els.updatedDate.textContent = state.data.meta.lastUpdated || "Onbekend";

  els.chapterNav.querySelectorAll("[data-chapter]").forEach(button => {
    button.addEventListener("click", () => {
      state.activeChapter = button.dataset.chapter;
      renderNavigation();
      renderArticles();
      closeMobileMenu();
      window.scrollTo({ top: document.querySelector(".layout").offsetTop - 12, behavior: "smooth" });
    });
  });
}

function renderNotice() {
  if (!state.data.meta.notice) {
    els.noticeContainer.innerHTML = "";
    return;
  }

  els.noticeContainer.innerHTML = `
    <div class="notice">
      <span aria-hidden="true">⚠</span>
      <div>
        <strong>${escapeHtml(state.data.meta.notice.title || "Mededeling")}</strong>
        <p>${escapeHtml(state.data.meta.notice.text || "")}</p>
      </div>
    </div>
  `;
}

function renderArticles() {
  const chapters = getVisibleChapters();
  const totalResults = chapters.reduce((sum, chapter) => sum + chapter.articles.length, 0);
  const hasQuery = Boolean(state.query.trim());

  els.resultLabel.textContent = hasQuery
    ? `Zoeken naar “${state.query.trim()}”`
    : state.activeChapter === "all"
      ? "Alle artikelen"
      : state.data.chapters.find(chapter => chapter.id === state.activeChapter)?.title || "Artikelen";

  els.resultCount.textContent = `${totalResults} ${totalResults === 1 ? "resultaat" : "resultaten"}`;
  els.clearSearchButton.hidden = !hasQuery;
  els.emptyState.hidden = totalResults !== 0;

  els.lawContainer.innerHTML = chapters.map((chapter, chapterIndex) => `
    <section class="chapter-section" id="chapter-${escapeHtml(chapter.id)}">
      <header class="chapter-heading">
        <span class="chapter-heading-number">${String(chapterIndex + 1).padStart(2, "0")}</span>
        <div>
          <h2>${highlight(chapter.title, state.query)}</h2>
          <p>${highlight(chapter.description || "", state.query)}</p>
        </div>
      </header>

      ${chapter.articles.map(article => {
        const articleId = `artikel-${slugify(article.number)}`;
        const tags = article.tags || [];
        const openClass = state.allExpanded || hasQuery ? " open" : "";

        return `
          <article class="article-card${openClass}" id="${articleId}">
            <button class="article-summary" type="button" aria-expanded="${state.allExpanded || hasQuery}">
              <span class="article-number">Art. ${highlight(article.number, state.query)}</span>

              <span class="article-title-wrap">
                <span class="article-title">${highlight(article.title, state.query)}</span>
                <span class="article-tags-preview">${highlight(tags.join(" · "), state.query)}</span>
              </span>

              <span class="article-quick-penalty">
                ${article.penalty?.jail ? `<span class="mini-badge">Cel: ${escapeHtml(article.penalty.jail)}</span>` : ""}
                ${article.penalty?.fine ? `<span class="mini-badge">Boete: ${escapeHtml(article.penalty.fine)}</span>` : ""}
              </span>

              <span class="chevron" aria-hidden="true">⌄</span>
            </button>

            <div class="article-details">
              <div class="article-body">
                <p>${highlight(article.description || "", state.query)}</p>

                <div class="penalties">
                  <div class="penalty-card">
                    <span>Celstraf</span>
                    <strong>${escapeHtml(formatPenalty(article.penalty?.jail))}</strong>
                  </div>
                  <div class="penalty-card">
                    <span>Boete</span>
                    <strong>${escapeHtml(formatPenalty(article.penalty?.fine))}</strong>
                  </div>
                  <div class="penalty-card">
                    <span>Rijbewijs- / strafpunten</span>
                    <strong>${escapeHtml(formatPenalty(article.penalty?.points))}</strong>
                  </div>
                </div>

                ${article.notes ? `<div class="article-extra"><strong>Toelichting:</strong> ${highlight(article.notes, state.query)}</div>` : ""}

                <div class="tags">
                  ${tags.map(tag => `<span class="tag">${highlight(tag, state.query)}</span>`).join("")}
                </div>

                <div class="article-actions">
                  <button type="button" data-copy="${articleId}">Link kopiëren</button>
                  <button type="button" data-print="${articleId}">Artikel afdrukken</button>
                </div>
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </section>
  `).join("");

  bindArticleInteractions();

  if (location.hash) {
    requestAnimationFrame(() => openArticleFromHash());
  }
}

function bindArticleInteractions() {
  document.querySelectorAll(".article-summary").forEach(button => {
    button.addEventListener("click", () => {
      const card = button.closest(".article-card");
      card.classList.toggle("open");
      button.setAttribute("aria-expanded", card.classList.contains("open"));
      history.replaceState(null, "", `#${card.id}`);
    });
  });

  document.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", async event => {
      event.stopPropagation();
      const url = new URL(location.href);
      url.hash = button.dataset.copy;

      try {
        await navigator.clipboard.writeText(url.toString());
        showToast("De link naar dit artikel is gekopieerd.");
      } catch {
        prompt("Kopieer deze link:", url.toString());
      }
    });
  });

  document.querySelectorAll("[data-print]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      const article = document.getElementById(button.dataset.print);
      article.classList.add("open");
      window.print();
    });
  });
}

function clearSearch() {
  state.query = "";
  els.searchInput.value = "";
  renderArticles();
  els.searchInput.focus();
}

function openArticleFromHash() {
  const id = location.hash.slice(1);
  if (!id) return;

  const article = document.getElementById(id);
  if (!article) return;

  article.classList.add("open", "highlight");
  article.querySelector(".article-summary")?.setAttribute("aria-expanded", "true");
  article.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => article.classList.remove("highlight"), 1500);
}

function openMobileMenu() {
  els.sidebar.classList.add("open");
  els.mobileOverlay.classList.add("show");
  els.menuButton.setAttribute("aria-expanded", "true");
}

function closeMobileMenu() {
  els.sidebar.classList.remove("open");
  els.mobileOverlay.classList.remove("show");
  els.menuButton.setAttribute("aria-expanded", "false");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("goudhaven-wetboek-theme", theme);
  els.themeButton.title = theme === "dark" ? "Lichte modus" : "Donkere modus";
}

function bindGlobalEvents() {
  els.searchInput.addEventListener("input", event => {
    state.query = event.target.value;
    renderArticles();
  });

  els.clearSearchButton.addEventListener("click", clearSearch);
  els.emptyClearButton.addEventListener("click", clearSearch);

  els.expandAllButton.addEventListener("click", () => {
    state.allExpanded = !state.allExpanded;
    els.expandAllButton.textContent = state.allExpanded ? "Alles sluiten" : "Alles openen";
    renderArticles();
  });

  els.menuButton.addEventListener("click", openMobileMenu);
  els.closeMenuButton.addEventListener("click", closeMobileMenu);
  els.mobileOverlay.addEventListener("click", closeMobileMenu);

  els.themeButton.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  });

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
    }

    if (event.key === "Escape") {
      closeMobileMenu();
      if (document.activeElement === els.searchInput && els.searchInput.value) clearSearch();
    }
  });

  window.addEventListener("hashchange", openArticleFromHash);
}

async function init() {
  try {
    const response = await fetch("data/wetboek.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();

    renderNavigation();
    renderNotice();
    renderArticles();
    bindGlobalEvents();

    const savedTheme = localStorage.getItem("goudhaven-wetboek-theme");
    applyTheme(savedTheme || "dark");
    document.getElementById("currentYear").textContent = new Date().getFullYear();
  } catch (error) {
    console.error(error);
    els.lawContainer.innerHTML = `
      <div class="empty-state">
        <div>⚠</div>
        <h2>Het wetboek kon niet worden geladen</h2>
        <p>Controleer of <strong>wetboek/data/wetboek.json</strong> bestaat en geldige JSON bevat.</p>
      </div>
    `;
  }
}

init();
