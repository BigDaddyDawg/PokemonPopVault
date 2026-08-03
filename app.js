(() => {
  const PAGE_SIZE = 48;
  const WISHLIST_KEY = "pokepopvault_wishlist_v1";
  const OWNED_KEY = "pokepopvault_owned_v1";
  const NEWS_URL = "https://funko.com/gb/funko-blog/";
  const LIVE_NEWS_URL = "https://r.jina.ai/https://funko.com/gb/funko-blog/";
  const SHOP_URL = "https://funko.com/gb/search?q=pokemon";
  /** Funko finish groups — Shared/Exclusive count as Standard. */
  const FINISH_ORDER = [
    "Standard",
    "Jumbo",
    "Flocked",
    "Diamond",
    "Metallic",
    "Pearlescent",
    "Soft Color",
  ];
  const FINISH_BLURBS = {
    Standard: "Regular-size Pop! releases",
    Jumbo: "10-inch / jumbo figures",
    Flocked: "Fuzzy flocked finishes",
    Diamond: "Diamond Collection sparkle",
    Metallic: "Metallic paint finishes",
    Pearlescent: "Pearlescent Pokémon Center finishes",
    "Soft Color": "Soft Color pastel finishes",
  };
  const FAV_PICKS = {
    Pikachu: ["Pikachu"],
    Eevee: ["Eevee"],
    Charizard: ["Charizard"],
  };
  const HEART_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.2s-6.7-4.2-9.1-8.1C1.2 9.4 2.1 6.4 5 5.4c1.8-.6 3.7.1 4.8 1.5C11 5.5 12.9 4.8 14.7 5.4c2.9 1 3.8 4 2.1 6.7-2.4 3.9-9.1 8.1-9.1 8.1z"/></svg>`;
  const CHECK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l5 5L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const els = {
    grid: document.getElementById("cardGrid"),
    sentinel: document.getElementById("sentinel"),
    empty: document.getElementById("emptyState"),
    countLabel: document.getElementById("countLabel"),
    search: document.getElementById("search"),
    setFilter: document.getElementById("setFilter"),
    rarityFilter: document.getElementById("rarityFilter"),
    storyFilter: document.getElementById("storyFilter"),
    ownFilter: document.getElementById("ownFilter"),
    clearFilters: document.getElementById("clearFilters"),
    activePills: document.getElementById("activePills"),
    modal: document.getElementById("cardModal"),
    modalClose: document.getElementById("modalClose"),
    modalImg: document.getElementById("modalImg"),
    modalStory: document.getElementById("modalStory"),
    modalName: document.getElementById("modalName"),
    modalVersion: document.getElementById("modalVersion"),
    modalRarity: document.getElementById("modalRarity"),
    modalSet: document.getElementById("modalSet"),
    modalType: document.getElementById("modalType"),
    modalColor: document.getElementById("modalColor"),
    modalWish: document.getElementById("modalWish"),
    modalOwn: document.getElementById("modalOwn"),
    panelCollection: document.getElementById("panelCollection"),
    panelOwned: document.getElementById("panelOwned"),
    panelWishlist: document.getElementById("panelWishlist"),
    panelComing: document.getElementById("panelComing"),
    tabCollection: document.getElementById("tabCollection"),
    tabOwned: document.getElementById("tabOwned"),
    tabWishlist: document.getElementById("tabWishlist"),
    tabComing: document.getElementById("tabComing"),
    ownedGrid: document.getElementById("ownedGrid"),
    ownedEmpty: document.getElementById("ownedEmpty"),
    ownedSearch: document.getElementById("ownedSearch"),
    ownedCountLabel: document.getElementById("ownedCountLabel"),
    ownedTabCount: document.getElementById("ownedTabCount"),
    wishGrid: document.getElementById("wishGrid"),
    wishEmpty: document.getElementById("wishEmpty"),
    wishSearch: document.getElementById("wishSearch"),
    wishCountLabel: document.getElementById("wishCountLabel"),
    wishTabCount: document.getElementById("wishTabCount"),
    comingStatus: document.getElementById("comingStatus"),
    comingRefresh: document.getElementById("comingRefresh"),
    upcomingSets: document.getElementById("upcomingSets"),
    newsList: document.getElementById("newsList"),
    revealsGrid: document.getElementById("revealsGrid"),
    revealsNote: document.getElementById("revealsNote"),
  };

  /** @type {{cards: any[], sets: any[], rarities: string[], stories: string[], count?: number}} */
  let catalog = { cards: [], sets: [], rarities: [], stories: [] };
  let filtered = [];
  let shown = 0;
  let searchTimer = null;
  let wishSearchTimer = null;
  let ownedSearchTimer = null;
  let comingLoaded = false;
  let comingBusy = false;
  /** @type {any} */
  let comingData = null;
  /** @type {any[]} */
  let comingDisplayCards = [];
  /** @type {Set<string>} */
  let wishlist = new Set();
  /** @type {Set<string>} */
  let owned = new Set();
  /** @type {string | null} */
  let modalCardId = null;
  let activeTab = "collection";
  /** @type {ReturnType<typeof window.FamilyListSync.create> | null} */
  let wishSync = null;
  /** @type {ReturnType<typeof window.FamilyListSync.create> | null} */
  let ownedSync = null;

  initStars();
  loadWishlist();
  loadOwned();
  boot();

  async function boot() {
    try {
      const res = await fetch("./data/cards.json");
      if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
      catalog = await res.json();
      await initFamilyVault();
      fillFilters();
      paintFavorites();
      bindUI();
      applyFilters();
      updateTrackerChrome();
      maybeOpenTabFromHash();
    } catch (err) {
      els.countLabel.textContent = "The vault wouldn’t open. Try refreshing.";
      console.error(err);
    }
  }

  async function initFamilyVault() {
    if (!window.FamilyListSync?.create) return;
    wishSync = window.FamilyListSync.create({
      app: "pokepopvault",
      listType: "wishlist",
      storageKey: WISHLIST_KEY,
      onRemoteChange: (ids) => {
        wishlist = new Set(ids.map(String));
        updateTrackerChrome();
        applyFilters();
        if (activeTab === "wishlist") renderWishlist();
        if (modalCardId) syncModalWishBtn();
      },
    });
    ownedSync = window.FamilyListSync.create({
      app: "pokepopvault",
      listType: "owned",
      storageKey: OWNED_KEY,
      onRemoteChange: (ids) => {
        owned = new Set(ids.map(String));
        updateTrackerChrome();
        applyFilters();
        if (activeTab === "owned") renderOwned();
        if (modalCardId) syncModalOwnBtn();
      },
    });
    wishlist = await wishSync.hydrate(wishlist);
    owned = await ownedSync.hydrate(owned);
    wishSync.subscribe();
    ownedSync.subscribe();
  }

  function loadWishlist() {
    try {
      const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      wishlist = new Set((Array.isArray(raw) ? raw : []).map(String));
    } catch {
      wishlist = new Set();
    }
  }

  function saveWishlist() {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify([...wishlist]));
    } catch (err) {
      console.warn("Could not save wishlist", err);
    }
  }

  function loadOwned() {
    try {
      const raw = JSON.parse(localStorage.getItem(OWNED_KEY) || "[]");
      owned = new Set((Array.isArray(raw) ? raw : []).map(String));
    } catch {
      owned = new Set();
    }
  }

  function saveOwned() {
    try {
      localStorage.setItem(OWNED_KEY, JSON.stringify([...owned]));
    } catch (err) {
      console.warn("Could not save owned list", err);
    }
  }

  function isWished(id) {
    return wishlist.has(String(id));
  }

  function isOwned(id) {
    return owned.has(String(id));
  }

  function toggleWish(id) {
    const key = String(id);
    if (wishlist.has(key)) wishlist.delete(key);
    else wishlist.add(key);
    saveWishlist();
    if (wishSync) wishSync.setItem(key, wishlist.has(key));
    syncWishButtons(key);
    updateTrackerChrome();
    if (activeTab === "wishlist") renderWishlist();
    if (activeTab === "collection") applyFilters();
    if (modalCardId === key) syncModalWishBtn();
    return wishlist.has(key);
  }

  function toggleOwn(id) {
    const key = String(id);
    if (owned.has(key)) owned.delete(key);
    else {
      owned.add(key);
      if (wishlist.has(key)) {
        wishlist.delete(key);
        saveWishlist();
        if (wishSync) wishSync.setItem(key, false);
        syncWishButtons(key);
      }
    }
    saveOwned();
    if (ownedSync) ownedSync.setItem(key, owned.has(key));
    syncOwnButtons(key);
    updateTrackerChrome();
    if (activeTab === "owned") renderOwned();
    if (activeTab === "wishlist") renderWishlist();
    if (activeTab === "collection") applyFilters();
    if (modalCardId === key) {
      syncModalOwnBtn();
      syncModalWishBtn();
    }
    return owned.has(key);
  }

  function fillFilters() {
    for (const set of catalog.sets) {
      const opt = document.createElement("option");
      opt.value = set.code;
      opt.textContent = set.name;
      els.setFilter.appendChild(opt);
    }
    for (const finish of FINISH_ORDER) {
      const opt = document.createElement("option");
      opt.value = finish;
      opt.textContent = finish;
      els.rarityFilter.appendChild(opt);
    }
    for (const story of catalog.stories) {
      const opt = document.createElement("option");
      opt.value = story;
      opt.textContent = story;
      els.storyFilter.appendChild(opt);
    }
  }

  function paintFavorites() {
    const map = {
      Pikachu: "favArtPika",
      Eevee: "favArtEevee",
      Charizard: "favArtChar",
    };
    for (const [story, id] of Object.entries(map)) {
      const art = document.getElementById(id);
      if (!art) continue;
      const names = FAV_PICKS[story] || [];
      const card =
        catalog.cards.find(
          (c) =>
            c.story === story &&
            names.includes(c.name) &&
            !/flocked|10 inch|jumbo/i.test(c.version || "")
        ) || catalog.cards.find((c) => c.story === story);
      if (card) art.style.backgroundImage = `url("${card.full || card.thumb}")`;
    }
  }

  function bindUI() {
    els.search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 160);
    });
    els.setFilter.addEventListener("change", applyFilters);
    els.rarityFilter.addEventListener("change", applyFilters);
    els.storyFilter.addEventListener("change", applyFilters);
    els.ownFilter?.addEventListener("change", applyFilters);
    els.clearFilters.addEventListener("click", () => {
      els.search.value = "";
      els.setFilter.value = "";
      els.rarityFilter.value = "";
      els.storyFilter.value = "";
      if (els.ownFilter) els.ownFilter.value = "";
      applyFilters();
    });

    document.querySelectorAll(".fav-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        showTab("collection");
        const story = btn.getAttribute("data-story") || "";
        els.search.value = "";
        els.setFilter.value = "";
        els.rarityFilter.value = "";
        els.storyFilter.value = story;
        if (els.ownFilter) els.ownFilter.value = "";
        applyFilters();
        document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    els.grid.addEventListener("click", onGridClick);
    els.ownedGrid?.addEventListener("click", onGridClick);
    els.wishGrid?.addEventListener("click", onGridClick);
    els.revealsGrid?.addEventListener("click", onGridClick);

    els.modalClose.addEventListener("click", () => els.modal.close());
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) els.modal.close();
    });
    els.modalWish?.addEventListener("click", () => {
      if (modalCardId) toggleWish(modalCardId);
    });
    els.modalOwn?.addEventListener("click", () => {
      if (modalCardId) toggleOwn(modalCardId);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modal.open) els.modal.close();
    });

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) renderMore();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(els.sentinel);

    els.tabCollection?.addEventListener("click", () => showTab("collection"));
    els.tabOwned?.addEventListener("click", () => showTab("owned"));
    els.tabWishlist?.addEventListener("click", () => showTab("wishlist"));
    els.tabComing?.addEventListener("click", () => showTab("coming"));
    els.wishSearch?.addEventListener("input", () => {
      clearTimeout(wishSearchTimer);
      wishSearchTimer = setTimeout(renderWishlist, 160);
    });
    els.ownedSearch?.addEventListener("input", () => {
      clearTimeout(ownedSearchTimer);
      ownedSearchTimer = setTimeout(renderOwned, 160);
    });
    els.comingRefresh?.addEventListener("click", () => loadComingSoon(true));
    window.addEventListener("hashchange", maybeOpenTabFromHash);
  }

  function onGridClick(e) {
    const ownBtn = e.target.closest(".own-btn");
    if (ownBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = ownBtn.dataset.ownId;
      if (id) toggleOwn(id);
      return;
    }
    const wishBtn = e.target.closest(".wish-btn");
    if (wishBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = wishBtn.dataset.wishId;
      if (id) toggleWish(id);
      return;
    }
    const btn = e.target.closest("[data-id]");
    if (!btn || btn.classList.contains("wish-btn") || btn.classList.contains("own-btn")) return;
    const id = btn.dataset.id;
    const card = findCard(id);
    if (card) openModal(card);
  }

  function maybeOpenTabFromHash() {
    const hash = (location.hash || "").toLowerCase();
    if (hash.includes("wishlist")) showTab("wishlist");
    else if (hash.includes("owned")) showTab("owned");
    else if (hash.includes("coming")) showTab("coming");
    else if (hash.includes("collection")) showTab("collection");
  }

  function showTab(name) {
    activeTab = name;
    const collection = name === "collection";
    const ownedTab = name === "owned";
    const wishlistTab = name === "wishlist";
    const coming = name === "coming";

    els.panelCollection.hidden = !collection;
    if (els.panelOwned) els.panelOwned.hidden = !ownedTab;
    if (els.panelWishlist) els.panelWishlist.hidden = !wishlistTab;
    els.panelComing.hidden = !coming;

    els.tabCollection.classList.toggle("is-active", collection);
    els.tabOwned?.classList.toggle("is-active", ownedTab);
    els.tabWishlist?.classList.toggle("is-active", wishlistTab);
    els.tabComing.classList.toggle("is-active", coming);

    if (coming) {
      history.replaceState(null, "", "#coming-soon");
      if (!comingLoaded) loadComingSoon(false);
    } else if (ownedTab) {
      history.replaceState(null, "", "#owned");
      renderOwned();
    } else if (wishlistTab) {
      history.replaceState(null, "", "#wishlist");
      renderWishlist();
    } else {
      history.replaceState(null, "", "#collection");
    }
  }

  function syncWishButtons(id) {
    const key = String(id);
    const on = isWished(key);
    const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
    document.querySelectorAll(`.wish-btn[data-wish-id="${safe}"]`).forEach((btn) => {
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Remove from wishlist" : "Add to wishlist");
    });
  }

  function syncOwnButtons(id) {
    const key = String(id);
    const on = isOwned(key);
    const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
    document.querySelectorAll(`.own-btn[data-own-id="${safe}"]`).forEach((btn) => {
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Mark as not owned" : "Mark as owned");
    });
    document.querySelectorAll(`.card-wrap[data-card-id="${safe}"]`).forEach((wrap) => {
      wrap.classList.toggle("is-owned", on);
    });
  }

  function syncModalWishBtn() {
    if (!els.modalWish || !modalCardId) return;
    const on = isWished(modalCardId);
    els.modalWish.classList.toggle("is-on", on);
    els.modalWish.setAttribute("aria-pressed", on ? "true" : "false");
    els.modalWish.textContent = on ? "Remove from wishlist" : "Add to wishlist";
  }

  function syncModalOwnBtn() {
    if (!els.modalOwn || !modalCardId) return;
    const on = isOwned(modalCardId);
    els.modalOwn.classList.toggle("is-on", on);
    els.modalOwn.setAttribute("aria-pressed", on ? "true" : "false");
    els.modalOwn.textContent = on ? "Remove from owned" : "Mark owned";
  }

  function updateTrackerChrome() {
    const wishN = wishlist.size;
    const ownedN = owned.size;
    if (els.wishTabCount) {
      els.wishTabCount.hidden = wishN === 0;
      els.wishTabCount.textContent = String(wishN);
    }
    if (els.ownedTabCount) {
      els.ownedTabCount.hidden = ownedN === 0;
      els.ownedTabCount.textContent = String(ownedN);
    }
    if (els.wishCountLabel) {
      els.wishCountLabel.textContent =
        wishN === 0
          ? "Shared family wishlist — same list on every phone."
          : `${wishN.toLocaleString()} Pop${wishN === 1 ? "" : "s"} on the wishlist.`;
    }
    if (els.ownedCountLabel) {
      const total = catalog.count || catalog.cards.length || 0;
      els.ownedCountLabel.textContent =
        ownedN === 0
          ? "Shared family shelf — anyone can tick these off."
          : `${ownedN.toLocaleString()} owned${total ? ` of ${total.toLocaleString()}` : ""} · ${
              total ? Math.round((ownedN / total) * 100) : 0
            }% of the catalogue.`;
    }
  }

  function finishOf(card) {
    const type = (card?.type || "").toLowerCase();
    if (type.includes("jumbo")) return "Jumbo";
    const raw = (card?.rarity || "").trim();
    if (FINISH_ORDER.includes(raw)) return raw;
    if (raw === "Shared" || raw === "Exclusive" || !raw) return "Standard";
    return raw;
  }

  function popNumber(card) {
    const n = Number(card?.number);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function sortByNumber(cards) {
    return [...cards].sort((a, b) => {
      const an = popNumber(a);
      const bn = popNumber(b);
      if (an == null && bn == null) return (a.name || "").localeCompare(b.name || "");
      if (an == null) return 1;
      if (bn == null) return -1;
      if (an !== bn) return an - bn;
      const fa = FINISH_ORDER.indexOf(finishOf(a));
      const fb = FINISH_ORDER.indexOf(finishOf(b));
      if (fa !== fb) return (fa < 0 ? 99 : fa) - (fb < 0 ? 99 : fb);
      return (a.fullName || "").localeCompare(b.fullName || "");
    });
  }

  function makeCardTile(card, i = 0) {
    const wrap = document.createElement("div");
    wrap.className = "card-wrap";
    wrap.style.animationDelay = `${Math.min(i, 12) * 28}ms`;

    const finish = finishOf(card);
    const num = popNumber(card);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.dataset.id = String(card.id);
    btn.setAttribute("aria-label", `${card.fullName}, ${finish}`);
    btn.innerHTML = `
      <img src="${escapeAttr(card.thumb || card.full)}" alt="" loading="lazy" decoding="async" width="160" height="200" />
      <span class="card-caption">
        <span class="card-num">${num != null ? `#${num}` : "—"}</span>
        <span class="card-name">${escapeHtml(card.name || card.fullName || "")}</span>
      </span>
      <span class="card-badge">${escapeHtml(finish)}</span>
    `;
    wrap.appendChild(btn);

    wrap.dataset.cardId = String(card.id);
    wrap.classList.toggle("is-owned", isOwned(card.id));
    wrap.classList.toggle("is-wished", isWished(card.id));

    if (isWishable(card.id)) {
      const own = document.createElement("button");
      own.type = "button";
      own.className = `own-btn${isOwned(card.id) ? " is-on" : ""}`;
      own.dataset.ownId = String(card.id);
      own.setAttribute("aria-pressed", isOwned(card.id) ? "true" : "false");
      own.setAttribute("aria-label", isOwned(card.id) ? "Mark as not owned" : "Mark as owned");
      own.innerHTML = CHECK_SVG;
      wrap.appendChild(own);

      const wish = document.createElement("button");
      wish.type = "button";
      wish.className = `wish-btn${isWished(card.id) ? " is-on" : ""}`;
      wish.dataset.wishId = String(card.id);
      wish.setAttribute("aria-pressed", isWished(card.id) ? "true" : "false");
      wish.setAttribute("aria-label", isWished(card.id) ? "Remove from wishlist" : "Add to wishlist");
      wish.innerHTML = HEART_SVG;
      wrap.appendChild(wish);
    }

    return wrap;
  }

  function isWishable(id) {
    return !String(id).startsWith("preview-");
  }

  function findCard(id) {
    const key = String(id);
    return (
      catalog.cards.find((c) => String(c.id) === key) ||
      comingDisplayCards.find((c) => String(c.id) === key) ||
      (comingData?.reveals || []).find((c) => String(c.id) === key) ||
      null
    );
  }

  function renderWishlist() {
    if (!els.wishGrid) return;
    const q = (els.wishSearch?.value || "").trim().toLowerCase();
    const cards = sortByNumber(
      [...wishlist]
        .map(findCard)
        .filter(Boolean)
        .filter((c) => {
          if (!q) return true;
          const hay = `${c.fullName} ${c.name} ${c.version} ${c.story} ${c.color || ""} ${finishOf(c)}`.toLowerCase();
          return hay.includes(q);
        })
    );

    els.wishGrid.innerHTML = "";
    const frag = document.createDocumentFragment();
    cards.forEach((card, i) => frag.appendChild(makeCardTile(card, i)));
    els.wishGrid.appendChild(frag);

    if (els.wishEmpty) {
      const emptyMsg =
        wishlist.size === 0
          ? "No cards saved yet. Browse the collection and tap a heart to begin."
          : "No saved cards match that search.";
      els.wishEmpty.textContent = emptyMsg;
      els.wishEmpty.hidden = cards.length !== 0;
    }
  }

  function renderOwned() {
    if (!els.ownedGrid) return;
    const q = (els.ownedSearch?.value || "").trim().toLowerCase();
    const cards = sortByNumber(
      [...owned]
        .map(findCard)
        .filter(Boolean)
        .filter((c) => {
          if (!q) return true;
          const hay = `${c.fullName} ${c.name} ${c.version} ${c.story} ${c.color || ""} ${finishOf(c)}`.toLowerCase();
          return hay.includes(q);
        })
    );

    els.ownedGrid.innerHTML = "";
    const frag = document.createDocumentFragment();
    cards.forEach((card, i) => frag.appendChild(makeCardTile(card, i)));
    els.ownedGrid.appendChild(frag);

    if (els.ownedEmpty) {
      els.ownedEmpty.textContent =
        owned.size === 0
          ? "No owned Pops yet. Tap the checkmark on any Pop to mark it owned."
          : "No owned Pops match that search.";
      els.ownedEmpty.hidden = cards.length !== 0;
    }
  }

  async function loadComingSoon(forceLive) {
    if (comingBusy) return;
    comingBusy = true;
    els.comingRefresh.disabled = true;
    els.comingStatus.textContent = forceLive
      ? "Refreshing the latest sightings…"
      : "Gathering upcoming waves and news…";

    try {
      const stamp = Date.now();
      const bakedRes = await fetch(`./data/coming-soon.json?t=${stamp}`, { cache: "no-store" });
      if (!bakedRes.ok) throw new Error(`coming-soon.json ${bakedRes.status}`);
      comingData = await bakedRes.json();

      // Live news pass — official site via CORS-friendly reader when she opens the tab
      let liveNews = null;
      try {
        liveNews = await fetchLiveNews();
      } catch (err) {
        console.warn("Live news unavailable, using baked copy.", err);
      }
      if (liveNews?.length) comingData.news = liveNews;

      renderComingSoon();
      comingLoaded = true;

      const when = comingData.generated
        ? new Date(comingData.generated).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "just now";
      const liveBit = liveNews?.length ? " · news refreshed live" : "";
      els.comingStatus.textContent = `Catalog snapshot ${when}${liveBit}`;
    } catch (err) {
      console.error(err);
      els.comingStatus.textContent =
        "Couldn’t reach the shop floor right now. Try Refresh in a moment.";
    } finally {
      comingBusy = false;
      els.comingRefresh.disabled = false;
    }
  }

  async function fetchLiveNews() {
    const res = await fetch(`${LIVE_NEWS_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "X-Return-Format": "html",
      },
    });
    if (!res.ok) throw new Error(`live news ${res.status}`);
    const html = await res.text();
    return parseLiveNewsMarkdown(html);
  }

  function parseNewsHtml(raw) {
    const items = [];
    const seen = new Set();
    const re =
      /<p class="date">(?<date>[^<]+)<\/p>\s*(?:<p class="category">(?<category>[^<]*)<\/p>\s*)?<h1 class="heading">(?<title>[^<]+)<\/h1>\s*(?:<p class="description">(?<summary>.*?)<\/p>)?/gis;
    let m;
    while ((m = re.exec(raw))) {
      const title = decodeEntities(m.groups.title || "").replace(/\s+/g, " ").trim();
      if (!title || seen.has(title.toLowerCase())) continue;
      if (/^(news|latest news|featured news|all news)$/i.test(title)) continue;
      seen.add(title.toLowerCase());
      const window = raw.slice(Math.max(0, m.index - 500), m.index + m[0].length + 500);
      const href = window.match(/href="(\/en-US\/news\/[^"]+)"/i);
      const img = window.match(/<img[^>]+src="([^"]+)"/i);
      items.push({
        title,
        date: decodeEntities(m.groups.date || "").trim(),
        category: decodeEntities(m.groups.category || "News").trim(),
        summary: decodeEntities(m.groups.summary || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 320),
        url: href ? `https://www.disneylorcana.com${href[1]}` : NEWS_URL,
        image: img ? img[1] : null,
      });
      if (items.length >= 16) break;
    }
    return items;
  }

  function decodeEntities(str) {
    const el = document.createElement("textarea");
    el.innerHTML = str || "";
    return el.value;
  }

  function parseLiveNewsMarkdown(md) {
    // Prefer baked HTML-quality items if markdown is too noisy; still salvage titles.
    const items = [];
    const seen = new Set();
    const lines = md.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const titleMatch = line.match(/^#+\s+(.+)$/);
      if (!titleMatch) continue;
      let title = titleMatch[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      title = title.replace(/!\[.*?\]\(.*?\)/g, "").trim();
      if (title.length < 8 || title.length > 120) continue;
      const skip = /^(US|News|Latest News|Featured News|All News|Products|Card Gallery|Challenge|Store Locator)$/i;
      if (skip.test(title)) continue;
      if (/Attack of the Vine!|Collection Starter|Companion App|Hyperia City|Winterspell|Fabled|Into the Inkdark/i.test(title) && title.length < 24) {
        // Product nav noise
        if (!/What’s New|Press Release|Creative Spotlight|Release Notes/i.test(title)) continue;
      }
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      let date = "";
      let summary = "";
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const nxt = lines[j].trim();
        if (!date) {
          const dm = nxt.match(
            /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})/
          );
          if (dm) date = dm[1];
        }
        if (nxt && !nxt.startsWith("#") && !nxt.startsWith("*") && nxt.length > 40 && !summary) {
          summary = nxt.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").slice(0, 280);
        }
      }
      items.push({
        title,
        date,
        category: "News",
        summary,
        url: NEWS_URL,
      });
      if (items.length >= 12) break;
    }
    return items;
  }

  function renderComingSoon() {
    const sets = comingData?.upcomingSets || [];
    els.upcomingSets.innerHTML = sets
      .map((set) => {
        const art = set.heroImage
          ? `style="background-image:url('${escapeAttr(set.heroImage)}')"`
          : "";
        const dates = [
          set.prereleaseLabel ? `Prerelease ${set.prereleaseLabel}` : null,
          set.releaseLabel
            ? `Everywhere ${set.releaseLabel}`
            : set.releaseDate
              ? `Release ${set.releaseDate}`
              : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const href = set.productUrl || SHOP_URL;
        const count =
          set.revealedCount > 0
            ? `${set.revealedCount} Pop${set.revealedCount === 1 ? "" : "s"} spotted so far`
            : "New figures not fully listed yet — check back as reveals drop";
        return `
          <a class="set-card" href="${escapeAttr(href)}" target="_blank" rel="noopener">
            <span class="set-card-art" ${art}></span>
            <span class="set-card-body">
              <span class="set-kicker">${escapeHtml(set.type || "Upcoming wave")}</span>
              <h4>${escapeHtml(set.name || "Untitled wave")}</h4>
              <p class="set-dates">${escapeHtml(dates || "Date TBA")}</p>
              <p class="set-blurb">${escapeHtml(set.blurb || "More Pops are on the way.")}</p>
              <p class="set-meta">${escapeHtml(count)}</p>
            </span>
          </a>
        `;
      })
      .join("");

    const news = comingData?.news || [];
    if (!news.length) {
      els.newsList.innerHTML = `<p class="coming-note">No headlines yet — tap Refresh, or visit the <a href="${NEWS_URL}" target="_blank" rel="noopener">Funko blog</a>.</p>`;
    } else {
      els.newsList.innerHTML = news
        .map((n) => {
          const thumb = n.image
            ? `<img class="news-thumb" src="${escapeAttr(n.image)}" alt="" loading="lazy" />`
            : `<div class="news-thumb placeholder" aria-hidden="true">✦</div>`;
          const meta = [n.date, n.category].filter(Boolean).join(" · ");
          return `
            <a class="news-item" href="${escapeAttr(n.url || NEWS_URL)}" target="_blank" rel="noopener">
              ${thumb}
              <span>
                <p class="news-date">${escapeHtml(meta || "Latest")}</p>
                <h4>${escapeHtml(n.title)}</h4>
                ${n.summary ? `<p class="news-summary">${escapeHtml(n.summary)}</p>` : ""}
              </span>
            </a>
          `;
        })
        .join("");
    }

    const reveals = comingData?.reveals || [];
    const previewArts = [];
    for (const set of sets) {
      for (const url of set.gallery || []) {
        if (!/\/cards?\//i.test(url)) continue;
        previewArts.push({
          id: `preview-${set.code}-${previewArts.length}`,
          fullName: `${set.name} preview`,
          name: set.name,
          version: "Official preview",
          rarity: "Preview",
          setName: set.name,
          setCode: set.code,
          story: "Coming Soon",
          type: "Preview",
          color: "",
          thumb: url,
          full: url,
        });
      }
    }
    const showCards = reveals.length ? reveals : previewArts;
    comingDisplayCards = showCards;
    els.revealsNote.textContent = reveals.length
      ? `${reveals.length} shop sighting${reveals.length === 1 ? "" : "s"} from current listings`
      : previewArts.length
        ? `${previewArts.length} preview image${previewArts.length === 1 ? "" : "s"} — full spoilers will appear here as they’re revealed`
        : "No early Pop art yet — as soon as new Pokémon are teased, they’ll land here.";
    els.revealsGrid.innerHTML = "";
    showCards.forEach((card, i) => {
      els.revealsGrid.appendChild(makeCardTile(card, i));
    });
  }

  function applyFilters() {
    const q = els.search.value.trim().toLowerCase();
    const setCode = els.setFilter.value;
    const finish = els.rarityFilter.value;
    const story = els.storyFilter.value;
    const shelf = els.ownFilter?.value || "";

    const seen = new Set();
    filtered = sortByNumber(
      catalog.cards.filter((c) => {
        if (setCode && c.setCode !== setCode) return false;
        if (finish && finishOf(c) !== finish) return false;
        if (story && c.story !== story) return false;
        if (shelf === "owned" && !isOwned(c.id)) return false;
        if (shelf === "missing" && isOwned(c.id)) return false;
        if (shelf === "wishlist" && !isWished(c.id)) return false;
        if (q) {
          const hay = `${c.fullName} ${c.name} ${c.version} ${c.story} ${c.color || ""} ${finishOf(c)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        // Guard against catalogue twins in older snapshots.
        const dedupeKey = [
          c.number ?? "x",
          (c.name || "").toLowerCase(),
          finishOf(c),
          (c.type || "").toLowerCase(),
          (c.version || "")
            .toLowerCase()
            .replace(/\b(target|gamestop|amazon|hot topic|funko shop|pokemon center|only at|special edition|nycc|sdcc)\b/g, "")
            .trim(),
        ].join("|");
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return true;
      })
    );

    shown = filtered.length;
    els.grid.innerHTML = "";
    updateMeta();
    renderCatalog();
  }

  function updateMeta() {
    const total = catalog.count || catalog.cards.length;
    const n = filtered.length;
    const parts = [];
    if (els.storyFilter.value) parts.push(els.storyFilter.value);
    if (els.setFilter.value) {
      const set = catalog.sets.find((s) => s.code === els.setFilter.value);
      parts.push(set?.name || els.setFilter.value);
    }
    if (els.rarityFilter.value) parts.push(els.rarityFilter.value);
    if (els.ownFilter?.value === "owned") parts.push("Owned");
    if (els.ownFilter?.value === "missing") parts.push("Not owned");
    if (els.ownFilter?.value === "wishlist") parts.push("On wishlist");
    if (els.search.value.trim()) parts.push(`“${els.search.value.trim()}”`);

    const ownedN = owned.size;
    if (n === total && !parts.length) {
      els.countLabel.textContent = `${total.toLocaleString()} Pops · ${ownedN.toLocaleString()} owned · sorted by #`;
    } else {
      els.countLabel.textContent = `${n.toLocaleString()} Pop${n === 1 ? "" : "s"} found · sorted by #`;
    }

    els.activePills.hidden = parts.length === 0;
    els.activePills.innerHTML = parts.map((p) => `<span class="pill">${escapeHtml(p)}</span>`).join("");
    els.empty.hidden = n !== 0;
  }

  function renderCatalog() {
    if (!filtered.length) return;

    const selectedFinish = els.rarityFilter.value;
    const groups = new Map();
    for (const finish of FINISH_ORDER) groups.set(finish, []);
    const extras = new Map();

    for (const card of filtered) {
      const finish = finishOf(card);
      if (groups.has(finish)) groups.get(finish).push(card);
      else {
        if (!extras.has(finish)) extras.set(finish, []);
        extras.get(finish).push(card);
      }
    }

    const frag = document.createDocumentFragment();
    const renderGroup = (finish, cards) => {
      if (!cards.length) return;
      if (selectedFinish && finish !== selectedFinish) return;
      const block = document.createElement("section");
      block.className = "finish-block";
      block.innerHTML = `
        <div class="finish-head">
          <h3 class="finish-label">${escapeHtml(finish)} <span class="finish-count">${cards.length}</span></h3>
          <p class="finish-note">${escapeHtml(FINISH_BLURBS[finish] || "Special finish")}</p>
        </div>
      `;
      const grid = document.createElement("div");
      grid.className = "grid grid-compact";
      cards.forEach((card, i) => grid.appendChild(makeCardTile(card, i)));
      block.appendChild(grid);
      frag.appendChild(block);
    };

    for (const finish of FINISH_ORDER) renderGroup(finish, groups.get(finish) || []);
    for (const [finish, cards] of extras) renderGroup(finish, cards);

    els.grid.appendChild(frag);
  }

  function renderMore() {
    // Collection renders fully by finish section; sentinel kept for compatibility.
  }

  function openModal(card) {
    modalCardId = String(card.id);
    els.modalImg.src = card.full || card.thumb;
    els.modalImg.alt = card.fullName;
    els.modalStory.textContent = card.story || "Pokémon";
    els.modalName.textContent = card.name || card.fullName;
    els.modalVersion.textContent = card.version ? card.version : card.fullName;
    els.modalRarity.textContent = finishOf(card);
    els.modalSet.textContent = card.setName || card.setCode || "—";
    els.modalType.textContent = card.type || "—";
    els.modalColor.textContent = card.color || "—";
    const trackable = isWishable(card.id);
    if (els.modalWish) {
      els.modalWish.hidden = !trackable;
      syncModalWishBtn();
    }
    if (els.modalOwn) {
      els.modalOwn.hidden = !trackable;
      syncModalOwnBtn();
    }
    if (typeof els.modal.showModal === "function") els.modal.showModal();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("'", "&#39;");
  }

  function initStars() {
    const canvas = document.getElementById("stars");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(160, Math.floor((w * h) / 14000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random(),
        s: Math.random() * 0.015 + 0.004,
        p: Math.random() * Math.PI * 2,
      }));
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (const star of stars) {
        const twinkle = reduce ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(t * star.s + star.p));
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 244, 210, ${twinkle * star.a})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", () => {
      cancelAnimationFrame(raf);
      resize();
      raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }
})();
