/* content.js – v2.3  (inflation-adjusted “how many” line added) */
(() => {
  /* ───────────────────────── CONSTANTS ───────────────────────── */
  const INDEXES   = { nasdaq: 0.12, sp500: 0.10, ftse: 0.07, custom: 0 };
  const INFLATION = 0.02;                                // 2 % per year (edit if you like)
  const PRICE_RE  = /(?:£|\$|€|₹)\s?(?:\d{1,3}(?:[, ]\d{3})*|\d+)(?:\.\d{2})?/g;
  const TIP_ID    = "ptfy-floating-tip";

  /* ───────────────────── PREFS & MEME LOADING ────────────────── */
  let prefs, memes = [];

  chrome.storage.sync.get(
    { age: 30, retireAge: 65, index: "nasdaq", customRate: 7, active: true },
    async data => {
      prefs = data;
      INDEXES.custom = data.customRate;
      try {
        memes = await fetch(chrome.runtime.getURL("memes/memes.json")).then(r => r.json());
      } catch { memes = []; }
      if (prefs.active) { annotateWholePage(); observeDOM(); }
    }
  );

  /* ────────────────────────── STYLES ─────────────────────────── */
  if (!document.getElementById("ptfy-style")) {
    const css = document.createElement("style");
    css.id = "ptfy-style";
    css.textContent = `
      :root { --ptfy-accent:#0bc; }

      .ptfy-bubble{
        color:var(--ptfy-accent)!important;
        cursor:pointer;
        position:relative;
        display:inline-block;
        transition:transform .15s cubic-bezier(.25,1.5,.5,1);
        animation:ptfy-pop .25s;
      }
      .ptfy-bubble:hover{ transform:scale(1.15); }

      @keyframes ptfy-pop{
        0%{transform:scale(.2);opacity:0}
        70%{transform:scale(1.25)}
        100%{transform:scale(1);opacity:1}
      }

      /* ─── Tooltip card ─── */
      #${TIP_ID}{
        position:fixed;max-width:260px;padding:14px;
        background:#fff;color:#111;border-radius:14px;
        box-shadow:0 12px 32px rgba(0,0,0,.28);
        font-family:system-ui,sans-serif;font-size:14px;line-height:1.3;
        display:flex;flex-direction:column;align-items:center;gap:10px;
        z-index:2147483647;pointer-events:none;
        transform-origin:bottom center;animation:fadeIn .18s ease-out;
      }
      @keyframes fadeIn{
        0%{opacity:0;transform:translateY(6px) scale(.94)}
        100%{opacity:1;transform:translateY(0) scale(1)}
      }
      #${TIP_ID} img{max-width:200px;max-height:140px;border-radius:8px;}
      #${TIP_ID} .cap{font-size:12px;color:#555;text-align:center;}
      #${TIP_ID} .mult{font-size:13px;font-weight:600;color:var(--ptfy-accent);}
      #${TIP_ID} .many{font-size:13px;font-weight:600;}
      #${TIP_ID}::after{
        content:"";position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
        border:6px solid transparent;border-top-color:#fff;
        filter:drop-shadow(0 -1px 2px rgba(0,0,0,.12));
      }
      /* 🎉 sprinkle */
      #${TIP_ID}::before{
        content:"🎉";position:absolute;top:-12px;right:-10px;font-size:18px;
        animation:wiggle 1.8s ease-in-out infinite alternate;
      }
      @keyframes wiggle{from{transform:rotate(-20deg);}to{transform:rotate(20deg);}}
    `;
    document.head.append(css);
  }

  /* ────────────────────── ANNOTATION ENGINE ─────────────────── */
  function annotateWholePage() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    annotate(nodes);
  }

  function annotate(nodes) {
    const years = prefs.retireAge - prefs.age;
    if (years <= 0) return;
    const rate = prefs.index === "custom" ? prefs.customRate : INDEXES[prefs.index];
    const inflFactor = Math.pow(1 + INFLATION, years);

    nodes.forEach(node => {
      if (node.parentElement?.closest(".ptfy-bubble")) return;
      PRICE_RE.lastIndex = 0;
      if (!PRICE_RE.test(node.textContent)) return;
      PRICE_RE.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let pos = 0;

      node.textContent.replace(PRICE_RE, (match, offset) => {
        frag.append(node.ownerDocument.createTextNode(node.textContent.slice(pos, offset)));

        const principal = parseFloat(match.replace(/[^0-9.]/g, ""));
        const futureVal = principal * Math.pow(1 + rate, years);      // nominal FV
        const buyable   = futureVal / (principal * inflFactor);        // real terms

        const span = node.ownerDocument.createElement("span");
        span.className = "ptfy-bubble";
        span.textContent = match;
        span.dataset.fv  = futureVal;
        span.dataset.pri = principal;
        span.dataset.buy = buyable;
        span.addEventListener("mouseenter", showTip);
        span.addEventListener("mouseleave", hideTip);
        frag.append(span);

        pos = offset + match.length;
      });

      frag.append(node.ownerDocument.createTextNode(node.textContent.slice(pos)));
      node.replaceWith(frag);
    });
  }

  function observeDOM() {
    let queued = false;
    new MutationObserver(muts => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const fresh = [];
        muts.forEach(m =>
          m.addedNodes.forEach(n => {
            if (n.nodeType === 3) fresh.push(n);
            else if (n.nodeType === 1) {
              const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
              while (w.nextNode()) fresh.push(w.currentNode);
            }
          })
        );
        if (fresh.length) annotate(fresh);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ──────────────────────── TOOLTIP ─────────────────────────── */
  function showTip(e) {
    hideTip();                                         // nuke existing card
    const span = e.currentTarget;
    const rect = span.getBoundingClientRect();

    const fv   = parseFloat(span.dataset.fv);
    const pri  = parseFloat(span.dataset.pri);
    const buy  = parseFloat(span.dataset.buy);

    const fvTxt = "≈ £" + fv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const mult  = (fv / pri).toFixed(1);
    const many  = buy >= 1000 ? buy.toExponential(1) : buy.toFixed(1);

    const memeObj = memes.length ? memes[Math.floor(Math.random() * memes.length)] : null;

    const tip = document.createElement("div");
    tip.id = TIP_ID;
    tip.innerHTML = `
      <strong style="font-size:16px;">${fvTxt} at ${prefs.retireAge}</strong>
      ${memeObj ? `<img src="${chrome.runtime.getURL(memeObj.file)}" alt=""><div class="cap">${memeObj.caption}</div>` : ""}
      <div class="mult">💸 ${mult}× your money</div>
      <div class="many">🛍️ Could buy <b>${many}</b> of these</div>
    `;
    document.body.append(tip);

    const tipRect = tip.getBoundingClientRect();
    const top  = rect.top  - tipRect.height - 12;
    const left = rect.left + rect.width / 2 - tipRect.width / 2;

    tip.style.top  = Math.max(8, top) + "px";
    tip.style.left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8)) + "px";
  }

  function hideTip() {
    document.getElementById(TIP_ID)?.remove();
  }
})();