/**
 * Shared family list sync (wishlist / owned) via the Family Vault Supabase hub.
 *
 * Model: one shared list per app + list_type for the whole family.
 * No accounts — every phone reads/writes the same rows.
 * Cloud is the source of truth after a one-time localStorage migration.
 *
 * Usage from app.js:
 *   const sync = window.FamilyListSync.create({
 *     app: "jellynest",
 *     listType: "wishlist",
 *     storageKey: "jellynest_wishlist_v1",
 *     onRemoteChange: (ids) => { wishlist = new Set(ids); ...refresh UI... }
 *   });
 *   await sync.hydrate(localSet);
 *   sync.subscribe();
 *   sync.setItem(id, true|false);
 */
(function () {
  const DEVICE_KEY = "family_vault_device_name_v1";
  const POLL_MS = 12000;

  function cfg() {
    return window.FAMILY_VAULT || {};
  }

  function ready() {
    const c = cfg();
    return Boolean((c.url || "").trim() && (c.anonKey || "").trim());
  }

  function deviceName() {
    try {
      let name = (localStorage.getItem(DEVICE_KEY) || "").trim();
      if (!name) {
        name = `device-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(DEVICE_KEY, name);
      }
      return name;
    } catch {
      return "unknown";
    }
  }

  function headers() {
    const key = cfg().anonKey.trim();
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    };
  }

  function baseUrl() {
    const table = (cfg().table || "family_list_items").trim();
    return `${cfg().url.replace(/\/$/, "")}/rest/v1/${table}`;
  }

  function sameSet(a, b) {
    if (a.size !== b.size) return false;
    for (const id of a) if (!b.has(id)) return false;
    return true;
  }

  function create(options) {
    const app = String(options.app || "").trim();
    const listType = String(options.listType || "wishlist").trim();
    const storageKey = String(options.storageKey || "").trim();
    const onRemoteChange =
      typeof options.onRemoteChange === "function" ? options.onRemoteChange : null;
    const migratedKey = `family_vault_migrated_${app}_${listType}_v1`;

    let client = null;
    let channel = null;
    let pollTimer = null;
    let lastKnown = new Set();
    let applyingRemote = false;

    function persistLocal(ids) {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify([...ids]));
      } catch (err) {
        console.warn("Could not cache list locally", err);
      }
    }

    function readLocal() {
      if (!storageKey) return new Set();
      try {
        const raw = JSON.parse(localStorage.getItem(storageKey) || "[]");
        return new Set((Array.isArray(raw) ? raw : []).map(String));
      } catch {
        return new Set();
      }
    }

    function wasMigrated() {
      try {
        return localStorage.getItem(migratedKey) === "1";
      } catch {
        return false;
      }
    }

    function markMigrated() {
      try {
        localStorage.setItem(migratedKey, "1");
      } catch {
        /* ignore */
      }
    }

    function applyRemote(ids, notify) {
      const next = new Set([...ids].map(String));
      lastKnown = next;
      persistLocal(next);
      if (notify && onRemoteChange) onRemoteChange([...next]);
      return next;
    }

    async function fetchRemote() {
      if (!ready()) return null;
      const url =
        `${baseUrl()}?app=eq.${encodeURIComponent(app)}` +
        `&list_type=eq.${encodeURIComponent(listType)}` +
        `&select=item_id`;
      const res = await fetch(url, {
        headers: {
          apikey: cfg().anonKey.trim(),
          Authorization: `Bearer ${cfg().anonKey.trim()}`,
        },
      });
      if (!res.ok) throw new Error(`Family vault fetch failed (${res.status})`);
      const rows = await res.json();
      return new Set((rows || []).map((r) => String(r.item_id)));
    }

    async function upsertItem(itemId) {
      if (!ready()) return;
      const res = await fetch(baseUrl(), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          app,
          list_type: listType,
          item_id: String(itemId),
          updated_by: deviceName(),
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Family vault upsert failed (${res.status}) ${text}`);
      }
    }

    async function deleteItem(itemId) {
      if (!ready()) return;
      const url =
        `${baseUrl()}?app=eq.${encodeURIComponent(app)}` +
        `&list_type=eq.${encodeURIComponent(listType)}` +
        `&item_id=eq.${encodeURIComponent(String(itemId))}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          apikey: cfg().anonKey.trim(),
          Authorization: `Bearer ${cfg().anonKey.trim()}`,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Family vault delete failed (${res.status}) ${text}`);
      }
    }

    /**
     * Cloud wins. One-time: push old phone-only items up, then never re-push
     * stale local cache (so another phone ticking something off stays off).
     */
    async function hydrate(seedSet) {
      const local = seedSet instanceof Set ? new Set([...seedSet].map(String)) : readLocal();
      if (!ready()) {
        persistLocal(local);
        lastKnown = local;
        return local;
      }
      try {
        let remote = await fetchRemote();
        if (!remote) {
          persistLocal(local);
          lastKnown = local;
          return local;
        }

        if (!wasMigrated() && local.size) {
          const toUpload = [...local].filter((id) => !remote.has(id));
          for (const id of toUpload) await upsertItem(id);
          if (toUpload.length) remote = (await fetchRemote()) || remote;
          markMigrated();
        } else {
          markMigrated();
        }

        return applyRemote(remote, false);
      } catch (err) {
        console.warn("Family vault hydrate failed; using local cache", err);
        persistLocal(local);
        lastKnown = local;
        return local;
      }
    }

    function setItem(itemId, wanted) {
      const id = String(itemId);
      const local = new Set(lastKnown.size ? lastKnown : readLocal());
      if (wanted) local.add(id);
      else local.delete(id);
      lastKnown = local;
      persistLocal(local);
      if (!ready()) return Promise.resolve(local);
      const op = wanted ? upsertItem(id) : deleteItem(id);
      return op
        .catch((err) => console.warn("Family vault sync failed", err))
        .then(() => local);
    }

    async function pullAndNotify() {
      if (applyingRemote) return;
      applyingRemote = true;
      try {
        const remote = await fetchRemote();
        if (!remote) return;
        if (sameSet(remote, lastKnown)) return;
        applyRemote(remote, true);
      } catch (err) {
        console.warn("Family vault pull failed", err);
      } finally {
        applyingRemote = false;
      }
    }

    function startPolling() {
      if (pollTimer || !ready()) return;
      pollTimer = window.setInterval(() => {
        pullAndNotify();
      }, POLL_MS);
    }

    function stopPolling() {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function subscribe() {
      if (!ready()) return;
      startPolling();
      if (!window.supabase?.createClient || channel) return;
      try {
        client = window.supabase.createClient(cfg().url.trim(), cfg().anonKey.trim());
        channel = client
          .channel(`family-list-${app}-${listType}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: cfg().table || "family_list_items",
              filter: `app=eq.${app}`,
            },
            () => {
              pullAndNotify();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn("Family vault realtime unavailable; polling only", err);
      }
    }

    function unsubscribe() {
      stopPolling();
      if (channel && client) {
        client.removeChannel(channel).catch(() => {});
      }
      channel = null;
      client = null;
    }

    return {
      ready,
      hydrate,
      setItem,
      subscribe,
      unsubscribe,
      pullAndNotify,
      readLocal,
    };
  }

  window.FamilyListSync = { create, ready };
})();
