(() => {
  const PAGE_SIZE = 48;
  const UNIVERSE_KEY = "ppv_universe_v1";
  const NEWS_URL = "https://funko.com/gb/funko-blog/";
  const LIVE_NEWS_URL = "https://r.jina.ai/https://funko.com/gb/funko-blog/";
  /** Funko finish groups — Shared/Exclusive count as Standard. */
  const FINISH_ORDER = [
    "Standard",
    "Jumbo",
    "Flocked",
    "Diamond",
    "Pearlescent",
    "Soft Color",
  ];
  const FINISH_BLURBS = {
    Standard: "Regular-size Pop! releases",
    Jumbo: "10-inch / jumbo figures",
    Flocked: "Fuzzy flocked finishes",
    Diamond: "Diamond Collection sparkle",
    Pearlescent: "Special pearlescent finishes",
    "Soft Color": "Soft Color pastel finishes",
  };

  const UNIVERSES = {
    pokemon: {
      id: "pokemon",
      tabLabel: "Pokemon",
      brand: "Poké Pop Vault",
      tagline: "Every Pokémon Funko Pop! — your shelf, your story.",
      introLine: "POKÉMON",
      introTag: "Open the collection.",
      catalogUrl: "./data/cards.json?v=16",
      comingUrl: "./data/coming-soon.json?v=16",
      wishlistKey: "pokepopvault_wishlist_v1",
      ownedKey: "pokepopvault_owned_v1",
      appSlug: "pokepopvault",
      shopUrl: "https://funko.com/gb/search?q=pokemon",
      themeColor: "#ee1515",
      toastWord: "Caught!",
      progressWord: "caught",
      storyLabel: "Pokémon",
      storyAll: "All Pokémon",
      seriesLabel: "Series",
      seriesAll: "All series",
      seriesOptions: null,
      favHeading: "Quick catch",
      favBlurb: "Jump to the legends on your radar.",
      comingScout: "Scouting the next wave of Pop! Pokémon…",
      revealsEmpty: "No early Pop art yet — as soon as new Pokémon are teased, they’ll land here.",
      emptySearch: "No Pops match that search. Try another trainer tip.",
      modalStoryFallback: "Pokémon",
      footerMain: "Poké Pop Vault · fan gallery · data via PriceCharting, Funko.com & community checklists",
      footerFine:
        "Market values are approximate GBP from recent PriceCharting sales (boxed), converted from USD. Pokémon and Funko Pop! are trademarks of their respective owners. Not affiliated with Nintendo, The Pokémon Company, Game Freak, or Funko.",
      confetti: ["#ee1515", "#ffffff", "#ffcb05", "#222224", "#ff6b6b"],
      favorites: [
        { story: "Pikachu", title: "Pikachu", kicker: "Electric", className: "fav-pika" },
        { story: "Lucario", title: "Lucario", kicker: "Fighting / Steel", className: "fav-lucario" },
        { story: "Charizard", title: "Charizard", kicker: "Fire / Flying", className: "fav-char" },
      ],
    },
    dragonball: {
      id: "dragonball",
      tabLabel: "Dragonball",
      brand: "Dragon Ball Pop Vault",
      tagline: "Every Dragon Ball Funko Pop! — power up your shelf.",
      introLine: "DRAGON BALL",
      introTag: "Summon the collection.",
      catalogUrl: "./data/dbz-cards.json?v=16",
      comingUrl: "./data/dbz-coming-soon.json?v=16",
      wishlistKey: "dbzpopvault_wishlist_v1",
      ownedKey: "dbzpopvault_owned_v1",
      appSlug: "dbzpopvault",
      shopUrl: "https://funko.com/gb/search?q=dragon+ball",
      themeColor: "#f57c00",
      toastWord: "Collected!",
      progressWord: "collected",
      storyLabel: "Character",
      storyAll: "All characters",
      seriesLabel: "Series",
      seriesAll: "All series",
      seriesOptions: [
        { code: "DB", name: "Dragonball" },
        { code: "Z", name: "Z" },
        { code: "GT", name: "GT" },
        { code: "SUPER", name: "Super" },
        { code: "DAIMA", name: "Daima" },
      ],
      favHeading: "Power picks",
      favBlurb: "Jump to the strongest on your radar.",
      comingScout: "Scouting the next wave of Dragon Ball Pops…",
      revealsEmpty: "No early Pop art yet — as soon as new Dragon Ball figures are teased, they’ll land here.",
      emptySearch: "No Pops match that search. Try another wish.",
      modalStoryFallback: "Dragon Ball",
      footerMain: "Dragon Ball Pop Vault · fan gallery · data via PriceCharting, Funko.com & community checklists",
      footerFine:
        "Market values are approximate GBP from recent PriceCharting sales (boxed), converted from USD. Dragon Ball and Funko Pop! are trademarks of their respective owners. Not affiliated with Toei Animation, Bird Studio / Shueisha, or Funko.",
      confetti: ["#f57c00", "#ffffff", "#ffd54f", "#15151c", "#ff9800"],
      favorites: [
        { story: "Goku", title: "Goku", kicker: "Saiyan", className: "fav-pika" },
        { story: "Vegeta", title: "Vegeta", kicker: "Prince", className: "fav-lucario" },
        { story: "Frieza", title: "Frieza", kicker: "Emperor", className: "fav-char" },
      ],
    },
  };

  const HEART_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.2s-6.7-4.2-9.1-8.1C1.2 9.4 2.1 6.4 5 5.4c1.8-.6 3.7.1 4.8 1.5C11 5.5 12.9 4.8 14.7 5.4c2.9 1 3.8 4 2.1 6.7-2.4 3.9-9.1 8.1-9.1 8.1z"/></svg>`;
  const CHECK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l5 5L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function readSavedUniverse() {
    try {
      const saved = localStorage.getItem(UNIVERSE_KEY);
      if (saved && UNIVERSES[saved]) return saved;
    } catch (_) {}
    return "pokemon";
  }

  let universeId = readSavedUniverse();
  let universe = UNIVERSES[universeId];
  let SHOP_URL = universe.shopUrl;
  let WISHLIST_KEY = universe.wishlistKey;
  let OWNED_KEY = universe.ownedKey;
  let switchingUniverse = false;
  let uiBound = false;

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
    modalPrice: document.getElementById("modalPrice"),
    modalWish: document.getElementById("modalWish"),
    modalOwn: document.getElementById("modalOwn"),
    panelCollection: document.getElementById("panelCollection"),
    panelOwned: document.getElementById("panelOwned"),
    panelWishlist: document.getElementById("panelWishlist"),
    panelComing: document.getElementById("panelComing"),
    tabCollection: document.getElementById("tabCollection"),
    tabOwned: document.getElementById("tabOwned"),
    tabForYou: document.getElementById("tabForYou"),
    tabWishlist: document.getElementById("tabWishlist"),
    tabComing: document.getElementById("tabComing"),
    ownedGrid: document.getElementById("ownedGrid"),
    ownedEmpty: document.getElementById("ownedEmpty"),
    ownedSearch: document.getElementById("ownedSearch"),
    ownedCountLabel: document.getElementById("ownedCountLabel"),
    ownedTabCount: document.getElementById("ownedTabCount"),
    panelForYou: document.getElementById("panelForYou"),
    forYouStatus: document.getElementById("forYouStatus"),
    forYouTaste: document.getElementById("forYouTaste"),
    forYouShelves: document.getElementById("forYouShelves"),
    forYouEmpty: document.getElementById("forYouEmpty"),
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
    intro: document.getElementById("intro"),
    introSkip: document.getElementById("introSkip"),
    statTotal: document.getElementById("statTotal"),
    statOwned: document.getElementById("statOwned"),
    statWish: document.getElementById("statWish"),
    statValue: document.getElementById("statValue"),
    caughtProgressFill: document.getElementById("caughtProgressFill"),
    caughtProgressLabel: document.getElementById("caughtProgressLabel"),
    caughtToast: document.getElementById("caughtToast"),
    confetti: document.getElementById("confetti"),
    brandTitle: document.getElementById("brandTitle"),
    brandTagline: document.getElementById("brandTagline"),
    introLine: document.getElementById("introLine"),
    introBrand: document.getElementById("introBrand"),
    introTag: document.getElementById("introTag"),
    favGrid: document.getElementById("favGrid"),
    favHeading: document.getElementById("favHeading"),
    favBlurb: document.getElementById("favBlurb"),
    storyFilterLabel: document.getElementById("storyFilterLabel"),
    storyFilterAll: document.getElementById("storyFilterAll"),
    seriesFilterLabel: document.getElementById("seriesFilterLabel"),
    footerMain: document.getElementById("footerMain"),
    footerFine: document.getElementById("footerFine"),
    universePokemon: document.getElementById("universePokemon"),
    universeDragonball: document.getElementById("universeDragonball"),
    universeTransition: document.getElementById("universeTransition"),
    themeColorMeta: document.querySelector('meta[name="theme-color"]'),
    installBanner: document.getElementById("installBanner"),
    installBannerTitle: document.getElementById("installBannerTitle"),
    installBannerText: document.getElementById("installBannerText"),
    installBannerGo: document.getElementById("installBannerGo"),
    installBannerDismiss: document.getElementById("installBannerDismiss"),
    installFooter: document.getElementById("installFooter"),
    installFooterBtn: document.getElementById("installFooterBtn"),
    installHelp: document.getElementById("installHelp"),
    installHelpClose: document.getElementById("installHelpClose"),
    installHelpDone: document.getElementById("installHelpDone"),
    installHelpLead: document.getElementById("installHelpLead"),
    installHelpSteps: document.getElementById("installHelpSteps"),
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
  applyUniverseChrome(false);
  playIntro();
  loadWishlist();
  loadOwned();
  boot();
  initInstallPrompt();

  async function boot() {
    try {
      const res = await fetch(universe.catalogUrl);
      if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
      catalog = await res.json();
      await initFamilyVault();
      fillFilters();
      paintFavorites();
      if (!uiBound) {
        bindUI();
        uiBound = true;
      }
      applyFilters();
      updateTrackerChrome();
      maybeOpenTabFromHash();
    } catch (err) {
      els.countLabel.textContent = "The vault wouldn’t open. Try refreshing.";
      console.error(err);
    }
  }

  const INSTALL_DISMISS_KEY = "ppv_install_dismissed_v1";
  /** @type {any} */
  let deferredInstallPrompt = null;

  function isStandaloneDisplay() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      // iOS Safari legacy
      Boolean(window.navigator.standalone)
    );
  }

  function isIosDevice() {
    const ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    // iPadOS desktop UA
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  }

  function isInstallDismissed() {
    try {
      return localStorage.getItem(INSTALL_DISMISS_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function markInstallDismissed() {
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    } catch (_) {}
  }

  function hideInstallBanner() {
    if (els.installBanner) els.installBanner.hidden = true;
  }

  function isMobileBrowse() {
    return (
      isIosDevice() ||
      /Android/i.test(navigator.userAgent || "") ||
      window.matchMedia("(max-width: 900px)").matches
    );
  }

  function showInstallFooter() {
    if (els.installFooter && !isStandaloneDisplay() && isMobileBrowse()) {
      els.installFooter.hidden = false;
    }
  }

  function revealInstallBanner() {
    if (!els.installBanner || isStandaloneDisplay() || isInstallDismissed()) return;
    if (!isMobileBrowse()) return;
    const ios = isIosDevice();
    if (!ios && !deferredInstallPrompt) return;
    if (els.installBannerTitle) {
      els.installBannerTitle.textContent = ios ? "Install on iPhone" : "Install Pop Vault";
    }
    if (els.installBannerText) {
      els.installBannerText.textContent = ios
        ? "Safari → Share → Add to Home Screen for the full app."
        : "Add the app icon for faster access and full-screen browsing.";
    }
    if (els.installBannerGo) {
      els.installBannerGo.textContent = ios || !deferredInstallPrompt ? "How to" : "Install";
    }
    els.installBanner.hidden = false;
  }

  function openInstallHelp() {
    const ios = isIosDevice();
    if (els.installHelpLead) {
      els.installHelpLead.textContent = ios
        ? "iPhone doesn’t show an Install button like Android — use Safari’s Share menu instead."
        : "Install Pop Vault for a full-screen app icon on your Home Screen.";
    }
    if (els.installHelpSteps) {
      if (ios) {
        els.installHelpSteps.innerHTML = `
          <li>Open this site in <strong>Safari</strong> (not Chrome or an in-app browser).</li>
          <li>Tap the <strong>Share</strong> button
            <span class="install-share-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 3l4 4h-3v6h-2V7H8l4-4zm-7 8h2v8h10v-8h2v10H5V11z"/></svg>
            </span>
            at the bottom of Safari.
          </li>
          <li>Scroll and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
        `;
      } else {
        els.installHelpSteps.innerHTML = `
          <li>Tap <strong>Install</strong> if your browser offers it.</li>
          <li>Or open the browser menu (⋮) and choose <strong>Install app</strong> / <strong>Add to Home screen</strong>.</li>
          <li>Open Pop Vault from your home screen for the full app view.</li>
        `;
      }
    }
    if (els.installHelp && typeof els.installHelp.showModal === "function") {
      els.installHelp.showModal();
    }
  }

  function closeInstallHelp() {
    if (els.installHelp?.open) els.installHelp.close();
  }

  async function runInstallAction() {
    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        if (choice?.outcome === "accepted") {
          hideInstallBanner();
          if (els.installFooter) els.installFooter.hidden = true;
          markInstallDismissed();
        }
      } catch (err) {
        console.warn("Install prompt failed", err);
        openInstallHelp();
      }
      return;
    }
    openInstallHelp();
  }

  function initInstallPrompt() {
    if (isStandaloneDisplay()) {
      hideInstallBanner();
      if (els.installFooter) els.installFooter.hidden = true;
      return;
    }

    showInstallFooter();

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (!isInstallDismissed()) revealInstallBanner();
      if (els.installBannerGo) els.installBannerGo.textContent = "Install";
      if (els.installBannerText) {
        els.installBannerText.textContent =
          "Add the app icon for faster access and full-screen browsing.";
      }
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      hideInstallBanner();
      if (els.installFooter) els.installFooter.hidden = true;
      markInstallDismissed();
    });

    els.installBannerGo?.addEventListener("click", () => {
      runInstallAction();
    });
    els.installBannerDismiss?.addEventListener("click", () => {
      markInstallDismissed();
      hideInstallBanner();
      showInstallFooter();
    });
    els.installFooterBtn?.addEventListener("click", () => {
      runInstallAction();
    });
    els.installHelpClose?.addEventListener("click", closeInstallHelp);
    els.installHelpDone?.addEventListener("click", closeInstallHelp);
    els.installHelp?.addEventListener("click", (e) => {
      if (e.target === els.installHelp) closeInstallHelp();
    });

    // iOS never fires beforeinstallprompt — show the guided banner after the intro.
    const delay = document.documentElement.classList.contains("skip-intro") ? 1200 : 4800;
    window.setTimeout(() => {
      if (isIosDevice()) revealInstallBanner();
      else if (deferredInstallPrompt) revealInstallBanner();
    }, delay);
  }

  function applyUniverseChrome(updateIntroCopy) {
    document.documentElement.setAttribute("data-universe", universeId);
    if (els.themeColorMeta) els.themeColorMeta.setAttribute("content", universe.themeColor);
    if (els.brandTitle) els.brandTitle.textContent = universe.brand;
    if (els.brandTagline) els.brandTagline.textContent = universe.tagline;
    if (updateIntroCopy !== false) {
      if (els.introLine) els.introLine.textContent = universe.introLine;
      if (els.introBrand) els.introBrand.textContent = universe.brand;
      if (els.introTag) els.introTag.textContent = universe.introTag;
    } else {
      if (els.introLine) els.introLine.textContent = universe.introLine;
      if (els.introBrand) els.introBrand.textContent = universe.brand;
      if (els.introTag) els.introTag.textContent = universe.introTag;
    }
    if (els.favHeading) els.favHeading.textContent = universe.favHeading;
    if (els.favBlurb) els.favBlurb.textContent = universe.favBlurb;
    if (els.storyFilterLabel) els.storyFilterLabel.textContent = universe.storyLabel;
    if (els.storyFilterAll) els.storyFilterAll.textContent = universe.storyAll;
    if (els.seriesFilterLabel) els.seriesFilterLabel.textContent = universe.seriesLabel || "Series";
    if (els.comingStatus && !comingLoaded) els.comingStatus.textContent = universe.comingScout;
    if (els.revealsNote) els.revealsNote.textContent = universe.revealsEmpty;
    if (els.empty) els.empty.textContent = universe.emptySearch;
    if (els.footerMain) els.footerMain.textContent = universe.footerMain;
    if (els.footerFine) els.footerFine.textContent = universe.footerFine;
    document.title =
      universeId === "dragonball"
        ? "Dragon Ball Pop Vault · Funko Gallery"
        : "Poké Pop Vault · Pokémon Funko Gallery";

    document.querySelectorAll(".universe-tab").forEach((btn) => {
      const active = btn.getAttribute("data-universe") === universeId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function playUniverseTransition(targetId) {
    const layer = els.universeTransition;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!layer || reduce) return;
    layer.hidden = false;
    layer.setAttribute("aria-hidden", "false");
    layer.dataset.fx = targetId;
    layer.classList.remove("is-open", "is-flash");
    layer.classList.add("is-on");
    await sleep(targetId === "dragonball" ? 1150 : 950);
    layer.classList.add("is-open");
    await sleep(380);
    layer.classList.add("is-flash");
    await sleep(280);
    layer.classList.remove("is-on", "is-open", "is-flash");
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");
  }

  async function switchUniverse(nextId) {
    if (!UNIVERSES[nextId] || nextId === universeId || switchingUniverse) return;
    switchingUniverse = true;
    try {
      await playUniverseTransition(nextId);
      universeId = nextId;
      universe = UNIVERSES[universeId];
      SHOP_URL = universe.shopUrl;
      WISHLIST_KEY = universe.wishlistKey;
      OWNED_KEY = universe.ownedKey;
      try {
        localStorage.setItem(UNIVERSE_KEY, universeId);
      } catch (_) {}

      if (wishSync?.unsubscribe) wishSync.unsubscribe();
      if (ownedSync?.unsubscribe) ownedSync.unsubscribe();
      wishSync = null;
      ownedSync = null;

      comingLoaded = false;
      comingBusy = false;
      comingData = null;
      comingDisplayCards = [];
      modalCardId = null;
      if (els.modal?.open) els.modal.close();

      applyUniverseChrome(true);
      if (els.search) els.search.value = "";
      if (els.setFilter) els.setFilter.value = "";
      if (els.rarityFilter) els.rarityFilter.value = "";
      if (els.storyFilter) els.storyFilter.value = "";
      if (els.ownFilter) els.ownFilter.value = "";
      loadWishlist();
      loadOwned();
      await boot();
      showTab("collection");
      burstConfetti();
    } finally {
      switchingUniverse = false;
    }
  }

  function playIntro() {
    const root = els.intro;
    if (!root) return;
    if (document.documentElement.classList.contains("skip-intro")) {
      root.hidden = true;
      return;
    }

    document.body.classList.add("is-introing");
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      try {
        sessionStorage.setItem("ppv_intro_seen", "1");
      } catch (_) {}
      root.classList.add("is-done");
      document.body.classList.remove("is-introing");
      document.documentElement.classList.remove("play-intro");
      window.setTimeout(() => {
        root.hidden = true;
        document.documentElement.classList.add("skip-intro");
        burstConfetti();
      }, 600);
    };

    els.introSkip?.addEventListener("click", finish, { once: true });
    window.setTimeout(finish, 4200);
  }

  function burstConfetti() {
    const layer = els.confetti;
    if (!layer) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    layer.innerHTML = "";
    layer.classList.add("is-on");
    const colors = universe.confetti || ["#ee1515", "#ffffff", "#ffcb05", "#222224", "#ff6b6b"];
    const count = 48;
    for (let i = 0; i < count; i++) {
      const bit = document.createElement("span");
      bit.className = "confetti-bit";
      const left = Math.random() * 100;
      const delay = Math.random() * 0.25;
      const duration = 1.1 + Math.random() * 0.9;
      const size = 6 + Math.random() * 8;
      bit.style.left = `${left}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.width = `${size}px`;
      bit.style.height = `${size * (0.6 + Math.random() * 0.8)}px`;
      bit.style.animationDelay = `${delay}s`;
      bit.style.animationDuration = `${duration}s`;
      bit.style.setProperty("--drift", `${(Math.random() - 0.5) * 140}px`);
      bit.style.setProperty("--spin", `${Math.random() > 0.5 ? 1 : -1}turn`);
      layer.appendChild(bit);
    }
    window.setTimeout(() => {
      layer.classList.remove("is-on");
      layer.innerHTML = "";
    }, 2200);
  }

  function showCaughtToast(card) {
    const toast = els.caughtToast;
    if (!toast || !card) return;
    const name = card.name || card.fullName || "Pop";
    const price = priceOf(card);
    toast.innerHTML = `<strong>${escapeHtml(universe.toastWord)}</strong> <span>${escapeHtml(name)}</span>${
      price ? ` <em>${escapeHtml(price)}</em>` : ""
    }`;
    toast.hidden = false;
    toast.classList.remove("is-show");
    void toast.offsetWidth;
    toast.classList.add("is-show");
    window.clearTimeout(showCaughtToast._timer);
    showCaughtToast._timer = window.setTimeout(() => {
      toast.classList.remove("is-show");
      window.setTimeout(() => {
        toast.hidden = true;
      }, 280);
    }, 2200);
  }

  async function initFamilyVault() {
    if (!window.FamilyListSync?.create) return;
    wishSync = window.FamilyListSync.create({
      app: universe.appSlug,
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
      app: universe.appSlug,
      listType: "owned",
      storageKey: OWNED_KEY,
      onRemoteChange: (ids) => {
        owned = new Set(ids.map(String));
        updateTrackerChrome();
        applyFilters();
        if (activeTab === "owned") renderOwned();
        if (activeTab === "foryou") renderForYou();
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
    let justCaught = false;
    if (owned.has(key)) owned.delete(key);
    else {
      owned.add(key);
      justCaught = true;
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
    if (activeTab === "foryou") renderForYou();
    if (activeTab === "collection") applyFilters();
    if (modalCardId === key) {
      syncModalOwnBtn();
      syncModalWishBtn();
    }
    if (justCaught) showCaughtToast(findCard(key));
    return owned.has(key);
  }

  function fillFilters() {
    if (els.setFilter) {
      const allLabel = universe.seriesAll || "All series";
      els.setFilter.innerHTML = `<option value="">${allLabel}</option>`;
      const seriesOpts =
        Array.isArray(universe.seriesOptions) && universe.seriesOptions.length
          ? universe.seriesOptions
          : (catalog.sets || []).map((s) => ({ code: s.code, name: s.name }));
      for (const set of seriesOpts) {
        const opt = document.createElement("option");
        opt.value = set.code;
        opt.textContent = set.name;
        els.setFilter.appendChild(opt);
      }
    }
    if (els.rarityFilter) {
      els.rarityFilter.innerHTML = `<option value="">All finishes</option>`;
      for (const finish of FINISH_ORDER) {
        const opt = document.createElement("option");
        opt.value = finish;
        opt.textContent = finish;
        els.rarityFilter.appendChild(opt);
      }
    }
    if (els.storyFilter) {
      els.storyFilter.innerHTML = "";
      const all = document.createElement("option");
      all.value = "";
      all.id = "storyFilterAll";
      all.textContent = universe.storyAll;
      els.storyFilter.appendChild(all);
      els.storyFilterAll = all;
      for (const story of catalog.stories) {
        const opt = document.createElement("option");
        opt.value = story;
        opt.textContent = story;
        els.storyFilter.appendChild(opt);
      }
    }
  }

  function paintFavorites() {
    const grid = els.favGrid;
    if (!grid) return;
    grid.innerHTML = "";
    for (const fav of universe.favorites) {
      const btn = document.createElement("button");
      btn.className = `fav-card ${fav.className || ""}`.trim();
      btn.type = "button";
      btn.dataset.story = fav.story;
      const artId = `favArt-${universeId}-${fav.story.replace(/\s+/g, "")}`;
      btn.innerHTML = `
        <span class="fav-art" id="${artId}"></span>
        <span class="fav-copy">
          <span class="fav-kicker">${escapeHtml(fav.kicker || "")}</span>
          <span class="fav-title">${escapeHtml(fav.title || fav.story)}</span>
        </span>
      `;
      const art = btn.querySelector(".fav-art");
      const card =
        catalog.cards.find(
          (c) =>
            c.story === fav.story &&
            !/flocked|10 inch|jumbo|gitd|chase|metallic|diamond/i.test(
              `${c.version || ""} ${c.rarity || ""}`
            )
        ) || catalog.cards.find((c) => c.story === fav.story);
      if (card && art) art.style.backgroundImage = `url("${card.thumb || card.full}")`;
      grid.appendChild(btn);
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

    els.favGrid?.addEventListener("click", (e) => {
      const btn = e.target.closest(".fav-card");
      if (!btn || !els.favGrid.contains(btn)) return;
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

    els.universePokemon?.addEventListener("click", () => switchUniverse("pokemon"));
    els.universeDragonball?.addEventListener("click", () => switchUniverse("dragonball"));

    els.grid.addEventListener("click", onGridClick);
    els.ownedGrid?.addEventListener("click", onGridClick);
    els.forYouShelves?.addEventListener("click", onGridClick);
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
    els.tabForYou?.addEventListener("click", () => showTab("foryou"));
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
    else if (hash.includes("foryou") || hash.includes("for-you")) showTab("foryou");
    else if (hash.includes("owned")) showTab("owned");
    else if (hash.includes("coming")) showTab("coming");
    else if (hash.includes("collection")) showTab("collection");
  }

  function showTab(name) {
    activeTab = name;
    const collection = name === "collection";
    const ownedTab = name === "owned";
    const forYouTab = name === "foryou";
    const wishlistTab = name === "wishlist";
    const coming = name === "coming";

    els.panelCollection.hidden = !collection;
    if (els.panelOwned) els.panelOwned.hidden = !ownedTab;
    if (els.panelForYou) els.panelForYou.hidden = !forYouTab;
    if (els.panelWishlist) els.panelWishlist.hidden = !wishlistTab;
    els.panelComing.hidden = !coming;

    els.tabCollection.classList.toggle("is-active", collection);
    els.tabOwned?.classList.toggle("is-active", ownedTab);
    els.tabForYou?.classList.toggle("is-active", forYouTab);
    els.tabWishlist?.classList.toggle("is-active", wishlistTab);
    els.tabComing.classList.toggle("is-active", coming);

    if (coming) {
      history.replaceState(null, "", "#coming-soon");
      if (!comingLoaded) loadComingSoon(false);
    } else if (ownedTab) {
      history.replaceState(null, "", "#owned");
      renderOwned();
    } else if (forYouTab) {
      history.replaceState(null, "", "#foryou");
      renderForYou();
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
    document.querySelectorAll(`.card-wrap[data-card-id="${safe}"]`).forEach((wrap) => {
      wrap.classList.toggle("is-wished", on);
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
    const total = catalog.count || catalog.cards.length || 0;
    if (els.wishTabCount) {
      els.wishTabCount.hidden = wishN === 0;
      els.wishTabCount.textContent = String(wishN);
    }
    if (els.ownedTabCount) {
      els.ownedTabCount.hidden = ownedN === 0;
      els.ownedTabCount.textContent = String(ownedN);
    }
    if (els.statTotal) els.statTotal.textContent = total ? total.toLocaleString() : "—";
    if (els.statOwned) els.statOwned.textContent = ownedN.toLocaleString();
    if (els.statWish) els.statWish.textContent = wishN.toLocaleString();

    let shelfGbp = 0;
    let priced = 0;
    for (const id of owned) {
      const card = findCard(id);
      const n = Number(card?.priceGbp);
      if (Number.isFinite(n)) {
        shelfGbp += n;
        priced += 1;
      } else if (card?.priceUsd != null && Number.isFinite(Number(card.priceUsd))) {
        shelfGbp += Number(card.priceUsd) * 0.79;
        priced += 1;
      }
    }
    if (els.statValue) {
      els.statValue.textContent =
        priced > 0
          ? new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              maximumFractionDigits: shelfGbp >= 100 ? 0 : 2,
            }).format(shelfGbp)
          : "£0";
    }

    const pct = total ? Math.round((ownedN / total) * 100) : 0;
    if (els.caughtProgressFill) els.caughtProgressFill.style.width = `${pct}%`;
    if (els.caughtProgressLabel) {
      els.caughtProgressLabel.textContent =
        total > 0
          ? `${pct}% ${universe.progressWord} · ${ownedN.toLocaleString()} / ${total.toLocaleString()}`
          : "Loading catch progress…";
    }

    if (els.wishCountLabel) {
      els.wishCountLabel.textContent =
        wishN === 0
          ? "Shared family wishlist — same list on every phone."
          : `${wishN.toLocaleString()} Pop${wishN === 1 ? "" : "s"} on the wishlist.`;
    }
    if (els.ownedCountLabel) {
      els.ownedCountLabel.textContent =
        ownedN === 0
          ? "Shared family shelf — anyone can tick these off."
          : `${ownedN.toLocaleString()} owned${total ? ` of ${total.toLocaleString()}` : ""} · ${pct}% of the catalogue.`;
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

  function formatGbp(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: n >= 100 ? 0 : 2,
    }).format(n);
  }

  function priceOf(card) {
    if (card?.priceGbp != null) return formatGbp(card.priceGbp);
    if (card?.priceUsd != null) {
      // Fallback display if only USD was stored.
      const gbp = Number(card.priceUsd) * 0.79;
      return formatGbp(gbp);
    }
    return null;
  }

  function makeCardTile(card, i = 0) {
    const wrap = document.createElement("div");
    wrap.className = "card-wrap";
    wrap.style.animationDelay = `${Math.min(i, 12) * 28}ms`;

    const finish = finishOf(card);
    const num = popNumber(card);
    const price = priceOf(card);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.dataset.id = String(card.id);
    btn.setAttribute("aria-label", `${card.fullName}, ${finish}${price ? `, ${price}` : ""}`);
    btn.innerHTML = `
      <span class="card-figure">
        <img src="${escapeAttr(card.thumb || card.full)}" alt="" loading="lazy" decoding="async" width="140" height="140" />
      </span>
      <span class="shelf-ledge" aria-hidden="true"></span>
      <span class="card-caption">
        <span class="card-num">${num != null ? `#${num}` : "—"}</span>
        <span class="card-name">${escapeHtml(card.name || card.fullName || "")}</span>
        <span class="card-price${price ? "" : " is-empty"}">${price ? escapeHtml(price) : "—"}</span>
      </span>
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

  function topCounts(map, limit = 3, min = 1) {
    return [...map.entries()]
      .filter(([, n]) => n >= min)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit);
  }

  function bumpCount(map, key, by = 1) {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + by);
  }

  function isBoutiqueExclusive(card) {
    const color = (card.color || "").trim();
    if (!color) return false;
    return !/^common retail$/i.test(color);
  }

  function isSpecialFinish(card) {
    const hay = `${card.rarity || ""} ${card.version || ""} ${card.type || ""}`.toLowerCase();
    return /flock|pearl|metallic|glitter|chrome|diamond|soft color|gitd|glow|blacklight|holographic|jumbo|10 inch|super sized|chase|le\b/.test(
      hay
    );
  }

  function buildTasteProfile(ownedCards) {
    const names = new Map();
    const stories = new Map();
    const finishes = new Map();
    const types = new Map();
    const exclusives = new Map();
    let specialScore = 0;

    for (const card of ownedCards) {
      bumpCount(names, card.name || card.story);
      bumpCount(stories, card.story);
      bumpCount(finishes, finishOf(card));
      bumpCount(types, card.type);
      if (isBoutiqueExclusive(card)) bumpCount(exclusives, card.color);
      if (isSpecialFinish(card)) specialScore += 1;
    }

    return {
      ownedCount: ownedCards.length,
      names: topCounts(names, 4),
      stories: topCounts(stories, 3),
      finishes: topCounts(finishes, 3),
      types: topCounts(types, 2),
      exclusives: topCounts(exclusives, 2),
      specialScore,
      lovesSpecials: specialScore >= Math.max(2, Math.ceil(ownedCards.length * 0.35)),
    };
  }

  function scoreRecommendation(card, taste) {
    let score = 0;
    /** @type {string[]} */
    const reasons = [];

    for (const [name, n] of taste.names) {
      if ((card.name || card.story) === name) {
        score += 14 + n * 3;
        reasons.push(`More ${name} for the shelf`);
        break;
      }
    }
    for (const [story, n] of taste.stories) {
      if (card.story === story) {
        score += 8 + n * 2;
        if (reasons.length < 2) reasons.push(`${story} energy`);
        break;
      }
    }
    const finish = finishOf(card);
    for (const [f, n] of taste.finishes) {
      if (finish === f && f && !/^shared$/i.test(f)) {
        score += 7 + n * 2;
        reasons.push(`That ${f} finish he keeps catching`);
        break;
      }
    }
    for (const [type, n] of taste.types) {
      if (card.type === type && type && type !== "Pop!") {
        score += 6 + n;
        if (reasons.length < 2) reasons.push(`More ${type} scale`);
        break;
      }
    }
    for (const [color, n] of taste.exclusives) {
      if (card.color === color) {
        score += 6 + n;
        reasons.push(`${color} exclusive vibes`);
        break;
      }
    }
    if (taste.lovesSpecials && isSpecialFinish(card)) {
      score += 8;
      reasons.push("Special finish energy");
    }
    if (isWished(card.id)) score += 2;

    return { score, reason: reasons[0] || "Matches his shelf" };
  }

  function makeRecoTile(card, reason, index) {
    const wrap = document.createElement("div");
    wrap.className = "reco-wrap";
    wrap.style.animationDelay = `${Math.min(index, 12) * 0.04}s`;
    wrap.appendChild(makeCardTile(card, index));
    if (reason) {
      const note = document.createElement("p");
      note.className = "reco-reason";
      note.textContent = reason;
      wrap.appendChild(note);
    }
    return wrap;
  }

  function appendRecoShelf(parent, title, blurb, items, used) {
    const fresh = items.filter((item) => !used.has(String(item.card.id)));
    if (!fresh.length) return;
    const article = document.createElement("article");
    article.className = "reco-shelf";
    article.innerHTML = `
      <div class="reco-shelf-head">
        <h3>${escapeHtml(title)}</h3>
        ${blurb ? `<p>${escapeHtml(blurb)}</p>` : ""}
      </div>
    `;
    const grid = document.createElement("div");
    grid.className = "grid shelf-row reco-grid";
    fresh.forEach((item, i) => {
      used.add(String(item.card.id));
      grid.appendChild(makeRecoTile(item.card, item.reason, i));
    });
    article.appendChild(grid);
    parent.appendChild(article);
  }

  function renderForYou() {
    if (!els.forYouShelves) return;
    const ownedCards = [...owned].map(findCard).filter(Boolean);
    els.forYouShelves.innerHTML = "";
    if (els.forYouTaste) {
      els.forYouTaste.hidden = true;
      els.forYouTaste.innerHTML = "";
    }

    if (!ownedCards.length) {
      if (els.forYouStatus) {
        els.forYouStatus.textContent = "Soft picks shaped by what’s already on his shelf.";
      }
      if (els.forYouEmpty) {
        els.forYouEmpty.hidden = false;
        els.forYouEmpty.textContent =
          "Mark a few Pops as owned, and we’ll nestle lookalike suggestions here — favourite characters, flocked finishes, exclusives, the lot.";
      }
      return;
    }

    const taste = buildTasteProfile(ownedCards);
    const pills = [
      ...taste.names.slice(0, 2).map(([k, n]) => `${k} ×${n}`),
      ...taste.finishes.slice(0, 2).map(([k]) => k),
      ...taste.exclusives.slice(0, 1).map(([k]) => k),
    ];
    if (taste.lovesSpecials) pills.unshift("Special finishes");
    if (els.forYouTaste && pills.length) {
      els.forYouTaste.hidden = false;
      els.forYouTaste.innerHTML = pills
        .filter(Boolean)
        .slice(0, 6)
        .map((p) => `<span class="taste-pill">${escapeHtml(p)}</span>`)
        .join("");
    }
    if (els.forYouStatus) {
      els.forYouStatus.textContent = `Reading ${taste.ownedCount} owned Pop${taste.ownedCount === 1 ? "" : "s"} for matching catches.`;
    }
    if (els.forYouEmpty) els.forYouEmpty.hidden = true;

    const scored = [];
    for (const card of catalog.cards) {
      if (isOwned(card.id)) continue;
      if (!isWishable(card.id)) continue;
      const { score, reason } = scoreRecommendation(card, taste);
      if (score < 8) continue;
      scored.push({ card, score, reason });
    }
    scored.sort((a, b) => b.score - a.score || a.card.name.localeCompare(b.card.name));

    if (!scored.length) {
      if (els.forYouEmpty) {
        els.forYouEmpty.hidden = false;
        els.forYouEmpty.textContent =
          "His shelf is wonderfully specific — no clear lookalikes right now. Add a few more owned Pops and try again.";
      }
      return;
    }

    const used = new Set();
    appendRecoShelf(
      els.forYouShelves,
      "Top picks for his shelf",
      "Closest matches to the display he’s building.",
      scored.slice(0, 12),
      used
    );

    for (const [name] of taste.names.slice(0, 3)) {
      const items = scored.filter((s) => (s.card.name || s.card.story) === name).slice(0, 8);
      appendRecoShelf(
        els.forYouShelves,
        `More ${name}`,
        `He already keeps catching ${name}.`,
        items,
        used
      );
    }

    for (const [finish] of taste.finishes.slice(0, 2)) {
      if (!finish || /^shared$/i.test(finish)) continue;
      const items = scored.filter((s) => finishOf(s.card) === finish).slice(0, 8);
      appendRecoShelf(
        els.forYouShelves,
        `More ${finish}`,
        "Because that finish already lives on the shelf.",
        items,
        used
      );
    }

    if (taste.lovesSpecials) {
      const items = scored.filter((s) => isSpecialFinish(s.card)).slice(0, 10);
      appendRecoShelf(
        els.forYouShelves,
        "Special & exclusive finishes",
        "Flocked, pearlescent, jumbo — the shiny ones he gravitates to.",
        items,
        used
      );
    }

    const leftovers = scored.filter((s) => !used.has(String(s.card.id))).slice(0, 10);
    appendRecoShelf(
      els.forYouShelves,
      "Still worth a peek",
      "Nearby flavours from the shelf’s pattern.",
      leftovers,
      used
    );
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
      const bakedRes = await fetch(`${universe.comingUrl}?t=${stamp}`, { cache: "no-store" });
      if (!bakedRes.ok) throw new Error(`${universe.comingUrl} ${bakedRes.status}`);
      comingData = await bakedRes.json();

      // Live news pass — official site via CORS-friendly reader when he opens the tab
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
        : universe.revealsEmpty;
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
      const code = els.setFilter.value;
      const fromUniverse = (universe.seriesOptions || []).find((s) => s.code === code);
      const set = catalog.sets.find((s) => s.code === code);
      parts.push(fromUniverse?.name || set?.name || code);
    }
    if (els.rarityFilter.value) parts.push(els.rarityFilter.value);
    if (els.ownFilter?.value === "owned") parts.push("Owned");
    if (els.ownFilter?.value === "missing") parts.push("Not owned");
    if (els.ownFilter?.value === "wishlist") parts.push("On wishlist");
    if (els.search.value.trim()) parts.push(`“${els.search.value.trim()}”`);

    const ownedN = owned.size;
    if (n === total && !parts.length) {
      els.countLabel.textContent = `${total.toLocaleString()} Pops on the shelves · ${ownedN.toLocaleString()} ${universe.progressWord}`;
    } else {
      els.countLabel.textContent = `${n.toLocaleString()} Pop${n === 1 ? "" : "s"} matched`;
    }

    els.activePills.hidden = parts.length === 0;
    els.activePills.innerHTML = parts.map((p) => `<span class="pill">${escapeHtml(p)}</span>`).join("");
    els.empty.hidden = n !== 0;
  }

  function renderFinishGroup(frag, finish, cards, selectedFinish) {
    if (!cards.length) return;
    if (selectedFinish && finish !== selectedFinish) return;
    const block = document.createElement("section");
    block.className = "finish-block shelf-bay";
    block.dataset.finish = finish;

    const head = document.createElement("button");
    head.type = "button";
    head.className = "finish-head";
    head.setAttribute("aria-expanded", "true");
    head.innerHTML = `
      <span class="finish-head-copy">
        <span class="finish-label">${escapeHtml(finish)} <span class="finish-count">${cards.length}</span></span>
        <span class="finish-note">${escapeHtml(FINISH_BLURBS[finish] || "Special finish")}</span>
      </span>
      <span class="finish-chevron" aria-hidden="true"></span>
    `;
    head.addEventListener("click", () => {
      const collapsed = block.classList.toggle("is-collapsed");
      head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });

    const grid = document.createElement("div");
    grid.className = "grid shelf-row";
    cards.forEach((card, i) => grid.appendChild(makeCardTile(card, i)));
    block.appendChild(head);
    block.appendChild(grid);
    frag.appendChild(block);
  }

  function groupByFinish(cards) {
    const groups = new Map();
    for (const finish of FINISH_ORDER) groups.set(finish, []);
    const extras = new Map();
    for (const card of cards) {
      const finish = finishOf(card);
      if (groups.has(finish)) groups.get(finish).push(card);
      else {
        if (!extras.has(finish)) extras.set(finish, []);
        extras.get(finish).push(card);
      }
    }
    return { groups, extras };
  }

  function renderCatalog() {
    if (!filtered.length) return;

    const selectedFinish = els.rarityFilter.value;
    const frag = document.createDocumentFragment();
    const nestBySeries = universeId === "dragonball";

    if (!nestBySeries) {
      const { groups, extras } = groupByFinish(filtered);
      for (const finish of FINISH_ORDER) renderFinishGroup(frag, finish, groups.get(finish) || [], selectedFinish);
      for (const [finish, cards] of extras) renderFinishGroup(frag, finish, cards, selectedFinish);
      els.grid.appendChild(frag);
      return;
    }

    const selectedSeries = els.setFilter?.value || "";
    const seriesOrder = (
      Array.isArray(universe.seriesOptions) && universe.seriesOptions.length
        ? universe.seriesOptions
        : (catalog.sets || []).map((s) => ({ code: s.code, name: s.name }))
    ).map((s) => s.code);
    const seriesName = (code, fallbackCard) => {
      const setMeta = (catalog.sets || []).find((s) => s.code === code);
      if (setMeta?.name) return setMeta.name;
      const fromUniverse = (universe.seriesOptions || []).find((s) => s.code === code);
      if (fromUniverse) return fromUniverse.name;
      return fallbackCard?.setName || code;
    };
    const bySeries = new Map();
    for (const code of seriesOrder) bySeries.set(code, []);
    for (const card of filtered) {
      const code = card.setCode || "Z";
      if (!bySeries.has(code)) bySeries.set(code, []);
      bySeries.get(code).push(card);
    }

    const renderSeriesBucket = (code, cards) => {
      if (!cards.length) return;
      if (selectedSeries && code !== selectedSeries) return;
      const title = seriesName(code, cards[0]);

      const series = document.createElement("section");
      series.className = "series-block";
      series.dataset.series = code;

      const head = document.createElement("div");
      head.className = "series-head";
      head.innerHTML = `
        <h3 class="series-title">${escapeHtml(title)} <span class="series-count">${cards.length}</span></h3>
        <p class="series-note">Grouped by Funko finish inside this saga.</p>
      `;
      series.appendChild(head);

      const body = document.createElement("div");
      body.className = "series-body";
      const { groups, extras } = groupByFinish(cards);
      for (const finish of FINISH_ORDER) renderFinishGroup(body, finish, groups.get(finish) || [], selectedFinish);
      for (const [finish, finishCards] of extras) renderFinishGroup(body, finish, finishCards, selectedFinish);
      series.appendChild(body);
      frag.appendChild(series);
    };

    for (const code of seriesOrder) renderSeriesBucket(code, bySeries.get(code) || []);
    for (const [code, cards] of bySeries) {
      if (!seriesOrder.includes(code)) renderSeriesBucket(code, cards);
    }

    els.grid.appendChild(frag);
  }

  function renderMore() {
    // Collection renders fully by finish section; sentinel kept for compatibility.
  }

  function openModal(card) {
    modalCardId = String(card.id);
    // Prefer mid-size art when possible; fall back to full / thumb.
    const art = card.full || card.thumb;
    els.modalImg.src = art;
    els.modalImg.alt = card.fullName;
    els.modalStory.textContent = card.story || universe.modalStoryFallback;
    els.modalName.textContent = card.name || card.fullName;
    els.modalVersion.textContent = card.version ? card.version : card.fullName;
    els.modalRarity.textContent = finishOf(card);
    els.modalSet.textContent = card.setName || card.setCode || "—";
    els.modalType.textContent = card.type || "—";
    els.modalColor.textContent = card.color || "—";
    if (els.modalPrice) {
      const price = priceOf(card);
      els.modalPrice.textContent = price || "No recent sales";
      els.modalPrice.classList.toggle("is-empty", !price);
    }
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
