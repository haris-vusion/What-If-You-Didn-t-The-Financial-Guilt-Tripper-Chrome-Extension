// content.js  🔥 v0.0.2
(() => {
  // (1) regex for £,$,€,₹ + commas + optional .00   – keep the g-flag
  const priceRegex = /(?:£|\$|€|₹)\s?(?:\d{1,3}(?:[, ]\d{3})*|\d+)(?:\.\d{2})?/g;

  async function getPrefs() {
    const defaults = { age: 30, retireAge: 65, returnRate: 0.10 };
    return new Promise((res) => chrome.storage.sync.get(defaults, (d) => res(d)));
  }

  async function annotate() {
    const { age, retireAge, returnRate } = await getPrefs();
    const years = retireAge - age;
    if (years <= 0) return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const victims = [];
    while (walker.nextNode()) victims.push(walker.currentNode);

    victims.forEach((node) => {
      /* --------- PATCH  (reset regex) --------- */
      priceRegex.lastIndex = 0;                 // <—  ADD THIS LINE
      if (!priceRegex.test(node.textContent)) return;
      priceRegex.lastIndex = 0;                 // <—  ADD THIS LINE
      /* ---------------------------------------- */

      const frag = document.createDocumentFragment();
      let pos = 0;
      node.textContent.replace(priceRegex, (match, offset) => {
        frag.append(document.createTextNode(node.textContent.slice(pos, offset)));

        const num = parseFloat(match.replace(/[^0-9.]/g, ""));
        const fv  = num * Math.pow(1 + returnRate, years);

        const span = document.createElement('span');
        span.className = 'ptfy-bubble';
        span.textContent = match;
        span.title = `Worth ≈ £${fv.toFixed(0)} at ${retireAge}`;
        frag.append(span);

        pos = offset + match.length;
      });
      frag.append(document.createTextNode(node.textContent.slice(pos)));
      node.replaceWith(frag);
    });
  }

  // initial run
  annotate();

  // re-run on dynamic pages (infinite scroll, etc.)
  const mo = new MutationObserver(() => annotate());
  mo.observe(document.body, { childList: true, subtree: true });
})();


if (!document.getElementById('ptfy-style')) {
  const style = document.createElement('style');
  style.id = 'ptfy-style';
  style.textContent = `
    .ptfy-bubble { color:#0b8; cursor:help; }      /* green & pointer */
  `;
  document.head.append(style);
}
