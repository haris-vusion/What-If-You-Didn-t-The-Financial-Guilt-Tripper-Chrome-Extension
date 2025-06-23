/* content.js  – v2.0  (sleek card tooltip + memes + ON/OFF)  */
(() => {
  /* ----------  constants  ---------- */
  const INDEXES = { nasdaq: 0.12, sp500: 0.10, ftse: 0.07, custom: 0 };
  const priceRegex =
    /(?:£|\$|€|₹)\s?(?:\d{1,3}(?:[, ]\d{3})*|\d+)(?:\.\d{2})?/g;
  const TOOLTIP_ID = "ptfy-floating-tip";

  /* ----------  prefs & meme loading  ---------- */
  let prefs = null;
  let memes = [];

  chrome.storage.sync.get(
    {
      age: 30,
      retireAge: 65,
      index: "nasdaq",
      customRate: 0.1,
      active: true
    },
    async (data) => {
      prefs = data;
      INDEXES.custom = data.customRate;
      try {
        memes = await fetch(
          chrome.runtime.getURL("memes/memes.json")
        ).then((r) => r.json());
      } catch {
        memes = [];
      }
      if (prefs.active) boot();
    }
  );

  /* ----------  CSS (once)  ---------- */
  if (!document.getElementById("ptfy-style")) {
    const style = document.createElement("style");
    style.id = "ptfy-style";
    style.textContent = `
      :root { --ptfy-accent:#0bc; }

      .ptfy-bubble{
        color:var(--ptfy-accent) !important;
        cursor:pointer;
        position:relative;
        display:inline-block;
        transition:transform .15s cubic-bezier(.25,1.5,.5,1);
        animation:ptfy-pop .25s ease-out;
      }
      .ptfy-bubble:hover{ transform:scale(1.15); }

      @keyframes ptfy-pop{
        0%{transform:scale(.2);opacity:0}
        70%{transform:scale(1.25)}
        100%{transform:scale(1);opacity:1}
      }

      /* floating tooltip */
      #${TOOLTIP_ID}{
        position:fixed;
        max-width:240px;
        background:#ffffff;
        color:#111;
        border-radius:12px;
        box-shadow:0 10px 28px rgba(0,0,0,.25);
        padding:12px 14px 14px;
        font-family:system-ui,sans-serif;
        font-size:14px;
        line-height:1.3;
        z-index:2147483647;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:8px;
        pointer-events:none;
        transform-origin:bottom center;
        animation:ptfy-fade .18s ease-out;
      }
      @keyframes ptfy-fade{
        0%{opacity:0;transform:translateY(4px) scale(.95)}
        100%{opacity:1;transform:translateY(0) scale(1)}
      }
      #${TOOLTIP_ID} img{
        max-width:180px;
        max-height:120px;
        border-radius:8px;
      }
      #${TOOLTIP_ID}::after{
        content:"";
        position:absolute;
        bottom:-6px; left:50%;
        transform:translateX(-50%);
        border:6px solid transparent;
        border-top-color:#ffffff;
        filter:drop-shadow(0 -1px 2px rgba(0,0,0,.15));
      }
    `;
    document.head.append(style);
  }

  /* ----------  core functions  ---------- */
  function boot() {
    annotateWholePage();
    observeMutations();
  }

  function annotateWholePage() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
    const batch = [];
    while (walker.nextNode()) batch.push(walker.currentNode);
    annotate(batch);
  }

  function annotate(nodes) {
    const years = prefs.retireAge - prefs.age;
    if (years <= 0) return;

    nodes.forEach((node) => {
      if (node.parentElement?.closest(".ptfy-bubble")) return;

      priceRegex.lastIndex = 0;
      if (!priceRegex.test(node.textContent)) return;
      priceRegex.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let pos = 0;
      node.textContent.replace(priceRegex, (match, offset) => {
        frag.append(node.ownerDocument.createTextNode(
          node.textContent.slice(pos, offset)
        ));

        const num = parseFloat(match.replace(/[^0-9.]/g, ""));
        const rate =
          prefs.index === "custom" ? prefs.customRate : INDEXES[prefs.index];
        const fv = num * Math.pow(1 + rate, years);

        const span = node.ownerDocument.createElement("span");
        span.className = "ptfy-bubble";
        span.textContent = match;
        span.dataset.tip = `≈ £${fv.toLocaleString()} at ${prefs.retireAge}`;
        span.addEventListener("mouseenter", showTip);
        span.addEventListener("mouseleave", hideTip);
        frag.append(span);

        pos = offset + match.length;
      });
      frag.append(node.ownerDocument.createTextNode(
        node.textContent.slice(pos)
      ));
      node.replaceWith(frag);
    });
  }

  function observeMutations() {
    let queued = false;
    const obs = new MutationObserver((muts) => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const fresh = [];
        muts.forEach((m) =>
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 3) fresh.push(n);
            else if (n.nodeType === 1) {
              const w = document.createTreeWalker(
                n,
                NodeFilter.SHOW_TEXT
              );
              while (w.nextNode()) fresh.push(w.currentNode);
            }
          })
        );
        if (fresh.length) annotate(fresh);
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* ----------  tooltip helpers  ---------- */
  function showTip(e) {
    hideTip(); // remove any existing tip first

    const span = e.currentTarget;
    const rect = span.getBoundingClientRect();
    const tip = document.createElement("div");
    tip.id = TOOLTIP_ID;

    // pick a meme
    let memeHTML = "";
    if (memes.length) {
      const m = memes[Math.floor(Math.random() * memes.length)];
      memeHTML = `<img src="${chrome.runtime.getURL(m.file)}" alt="">`;
    }

    tip.innerHTML = `
      <strong>${span.dataset.tip}</strong>
      ${memeHTML}
    `;
    document.body.append(tip);

    // position centered above the span
    const tipRect = tip.getBoundingClientRect();
    const top = rect.top - tipRect.height - 10;
    const left = rect.left + rect.width / 2 - tipRect.width / 2;
    tip.style.top = Math.max(8, top) + "px";
    tip.style.left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8)) + "px";
  }

  function hideTip() {
    const existing = document.getElementById(TOOLTIP_ID);
    if (existing) existing.remove();
  }
})();