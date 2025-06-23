/* content.js  –  v1.0 “Glow-Up”  */
(() => {
  /* ----------  Config  ---------- */
  const INDEXES = {
    nasdaq: 0.12,
    sp500: 0.10,
    ftse: 0.07,
    custom: 0       /* real value lives in storage */
  };

  const priceRegex =
    /(?:£|\$|€|₹)\s?(?:\d{1,3}(?:[, ]\d{3})*|\d+)(?:\.\d{2})?/g;

  /* ----------  Load prefs once  ---------- */
  const prefsP = new Promise((res) => {
    chrome.storage.sync.get(
      { age: 30, retireAge: 65, index: "nasdaq", customRate: 0.10 },
      (d) => res(d)
    );
  });

  /* ----------  Style injection  ---------- */
  if (!document.getElementById("ptfy-style")) {
    const css = document.createElement("style");
    css.id = "ptfy-style";
    css.textContent = `
      :root { --ptfy-color: #0bc; }

      .ptfy-bubble {
        color: var(--ptfy-color) !important;
        cursor: pointer;
        position: relative;
        display: inline-block;
        transition: transform .15s cubic-bezier(.25,1.5,.5,1);
      }
      .ptfy-bubble:hover { transform: scale(1.15); }

      /* fancy tooltip */
      .ptfy-bubble::after {
        content: attr(data-tip);
        position: absolute;
        left: 50%; top: -2.4em;
        transform: translateX(-50%) scale(.8);
        background: #111;
        color: #fff;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.2;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity .18s ease, transform .18s ease;
        box-shadow: 0 2px 6px rgba(0,0,0,.35);
      }
      .ptfy-bubble:hover::after {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }

      @keyframes ptfy-pop {
        0%   { transform: scale(.2); opacity: 0; }
        70%  { transform: scale(1.25); }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.append(css);
  }

  /* ----------  Annotator ---------- */
  async function annotate(nodes) {
    const { age, retireAge, index, customRate } = await prefsP;
    const annual = index === "custom" ? customRate : INDEXES[index];
    const yrs = retireAge - age;
    if (yrs <= 0) return;

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
        const fv = num * Math.pow(1 + annual, yrs);

        const span = node.ownerDocument.createElement("span");
        span.className = "ptfy-bubble";
        span.textContent = match;
        span.setAttribute(
          "data-tip",
          `≈ £${fv.toLocaleString()} at ${retireAge}`
        );
        span.style.animation = "ptfy-pop .25s ease-out";
        frag.append(span);

        pos = offset + match.length;
      });
      frag.append(node.ownerDocument.createTextNode(node.textContent.slice(pos)));
      node.replaceWith(frag);
    });
  }

  /* ----------  Initial pass ---------- */
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const startNodes = [];
  while (walker.nextNode()) startNodes.push(walker.currentNode);
  annotate(startNodes);

  /* ----------  Observe mutations ---------- */
  let scheduled = false;
  const mo = new MutationObserver((muts) => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const newText = [];
      muts.forEach((m) =>
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 3) newText.push(n);
          else if (n.nodeType === 1) {
            const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
            while (w.nextNode()) newText.push(w.currentNode);
          }
        })
      );
      if (newText.length) annotate(newText);
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();