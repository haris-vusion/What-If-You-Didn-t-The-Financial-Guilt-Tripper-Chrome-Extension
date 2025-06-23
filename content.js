// content.js  v0.0.3  – no more Matryoshka spans
(() => {
  const priceRegex = /(?:£|\$|€|₹)\s?(?:\d{1,3}(?:[, ]\d{3})*|\d+)(?:\.\d{2})?/g;

  const defaults = { age: 30, retireAge: 65, returnRate: 0.10 };

  /** Fetch prefs once and cache (they rarely change) */
  const prefsPromise = new Promise((res) =>
    chrome.storage.sync.get(defaults, (d) => res(d))
  );

  /** Style – inject one time */
  if (!document.getElementById('ptfy-style')) {
    const css = document.createElement('style');
    css.id = 'ptfy-style';
    css.textContent = `
      .ptfy-bubble{
        color:#0b8 !important;
        position:relative;
        cursor:help;
      }
      .ptfy-bubble::after{
        content:attr(data-tip);
        position:absolute;
        left:0;
        top:-1.8em;
        white-space:nowrap;
        background:#111;
        color:#fff;
        padding:2px 6px;
        border-radius:4px;
        font-size:12px;
        opacity:0;
        transition:opacity .15s;
        z-index:999999;
        pointer-events:none;
      }
      .ptfy-bubble:hover::after{opacity:1;}
    `;
    document.head.append(css);
  }

  async function annotate(nodeList) {
    const { age, retireAge, returnRate } = await prefsPromise;
    const years = retireAge - age;
    if (years <= 0) return;

    nodeList.forEach((node) => {
      // Skip if already inside one of our bubbles
      if (node.parentElement?.closest('.ptfy-bubble')) return;

      priceRegex.lastIndex = 0;
      if (!priceRegex.test(node.textContent)) return;
      priceRegex.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let pos = 0;
      node.textContent.replace(priceRegex, (match, offset) => {
        frag.append(node.ownerDocument.createTextNode(node.textContent.slice(pos, offset)));

        const num = parseFloat(match.replace(/[^0-9.]/g, ""));
        const fv = num * Math.pow(1 + returnRate, years);

        const span = node.ownerDocument.createElement('span');
        span.className = 'ptfy-bubble';
        span.textContent = match;
        span.setAttribute('data-tip', `≈ £${fv.toLocaleString(undefined,{maximumFractionDigits:0})} at ${retireAge}`);
        frag.append(span);

        pos = offset + match.length;
      });
      frag.append(node.ownerDocument.createTextNode(node.textContent.slice(pos)));
      node.replaceWith(frag);
    });
  }

  /** Run once on initial DOM */
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const initialNodes = [];
  while (walker.nextNode()) initialNodes.push(walker.currentNode);
  annotate(initialNodes);

  /** Observe later additions – debounce to once per animation frame */
  let scheduled = false;
  const obs = new MutationObserver((mutations) => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const newTextNodes = [];
      mutations.forEach((m) =>
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 3) newTextNodes.push(n); // TEXT_NODE
          else if (n.nodeType === 1) { // ELEMENT_NODE
            const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
            while (w.nextNode()) newTextNodes.push(w.currentNode);
          }
        })
      );
      if (newTextNodes.length) annotate(newTextNodes);
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();

if (!document.getElementById('ptfy-style')) {
  const style = document.createElement('style');
  style.id = 'ptfy-style';
  style.textContent = `
    .ptfy-bubble { color:#0b8; cursor:help; }      /* green & pointer */
  `;
  document.head.append(style);
}
