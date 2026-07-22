// Shared helpers used across pages.

const VISITOR_KEY = "examPortalVisitor";

function getVisitor() {
  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setVisitor(v) {
  localStorage.setItem(VISITOR_KEY, JSON.stringify(v));
}

// Call at the top of every page (except index.html itself) to enforce
// the mandatory name+location gate before anything else loads.
function requireVisitorOrRedirect() {
  const v = getVisitor();
  if (!v || !v.visitorId) {
    window.location.href = "/index.html";
    return null;
  }
  // fire-and-forget ping so repeat visits are tracked too
  fetch(`/api/visitors/${v.visitorId}/ping`, { method: "POST" }).catch(() => {});
  return v;
}

function renderWhoBadge(elId) {
  const v = getVisitor();
  const el = document.getElementById(elId);
  if (!el || !v) return;
  el.innerHTML = `${escapeHtml(v.name)} · logged in <a href="#" id="switch-visitor-link" class="who-switch">switch</a>`;
  const link = document.getElementById("switch-visitor-link");
  link.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem(VISITOR_KEY);
    window.location.href = "/index.html";
  });
}

function formatSeconds(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------- Shared modal / toast (replaces native confirm()/alert()) ----------

function ensureOverlayRoot() {
  let root = document.getElementById("modal-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "modal-root";
    document.body.appendChild(root);
  }
  return root;
}

// Promise-based confirm dialog styled to match the site instead of the
// browser's native confirm(), which looks jarring and blocks on some
// mobile browsers. Resolves true/false.
function showConfirm({ title = "Are you sure?", body = "", confirmText = "Confirm", cancelText = "Cancel", danger = false } = {}) {
  return new Promise((resolve) => {
    const root = ensureOverlayRoot();
    const wrap = document.createElement("div");
    wrap.className = "modal-overlay";
    wrap.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <h3>${escapeHtml(title)}</h3>
        <p>${body}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" data-act="cancel">${escapeHtml(cancelText)}</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;
    root.appendChild(wrap);

    function close(result) {
      wrap.remove();
      resolve(result);
    }

    wrap.querySelector('[data-act="cancel"]').addEventListener("click", () => close(false));
    wrap.querySelector('[data-act="confirm"]').addEventListener("click", () => close(true));
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) close(false);
    });
    document.addEventListener(
      "keydown",
      function onKey(e) {
        if (!document.body.contains(wrap)) {
          document.removeEventListener("keydown", onKey);
          return;
        }
        if (e.key === "Escape") close(false);
      }
    );

    requestAnimationFrame(() => wrap.querySelector('[data-act="confirm"]').focus());
  });
}

// One-off informational dialog (replaces native alert()).
function showAlert({ title = "Heads up", body = "", okText = "OK" } = {}) {
  return new Promise((resolve) => {
    const root = ensureOverlayRoot();
    const wrap = document.createElement("div");
    wrap.className = "modal-overlay";
    wrap.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <h3>${escapeHtml(title)}</h3>
        <p>${body}</p>
        <div class="modal-actions">
          <button class="btn btn-primary" data-act="ok">${escapeHtml(okText)}</button>
        </div>
      </div>
    `;
    root.appendChild(wrap);
    wrap.querySelector('[data-act="ok"]').addEventListener("click", () => {
      wrap.remove();
      resolve();
    });
    requestAnimationFrame(() => wrap.querySelector('[data-act="ok"]').focus());
  });
}

// Small transient toast for non-blocking notices.
function showToast(message, { type = "info", duration = 3200 } = {}) {
  const root = ensureOverlayRoot();
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, duration);
}
