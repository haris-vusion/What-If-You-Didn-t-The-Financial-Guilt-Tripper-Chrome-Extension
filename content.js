// Sneaky price sniper 🦅
(() => {
    /** Regex: currency (£, €, $, ₹, etc.) + digits with optional commas/decimals */
    const priceRegex =
      /(?:£|\$|€|₹)\s?(?:\d{1,3}(?:[, ]\d{3})*|\d+)(?:\.\d{2})?/g;
  
    /** Load user prefs from chrome.storage (age, retireAge, returnRate) */
    async function getPrefs() {
      const defaults = { age: 30, retireAge: 65, returnRate: 0.10 };
      return new Promise((res) =>
        chrome.storage.sync.get(defaults, (data) => res(data))
      );
    }
  
    /** Annotate every text node within body */
    async function annotate() {
      const { age, retireAge, returnRate } = await getPrefs();
      const years = retireAge - age;
      if (years <= 0) return; // User wants to retire yesterday: skip
  
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
  
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
  
      nodes.forEach((n) => {
        const original = n.textContent;
        if (!priceRegex.test(original)) return;
  
        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        original.replace(priceRegex, (match, offset) => {
          // Append text before the match
          frag.appendChild(document.createTextNode(original.slice(lastIndex, offset)));
  
          const priceNumber = parseFloat(match.replace(/[^0-9.]/g, ""));
          const futureValue = priceNumber * Math.pow(1 + returnRate, years);
  
          // Bubble element
          const span = document.createElement("span");
          span.className = "ptfy-bubble";
          span.textContent = match;
          span.title = `Worth ≈ £${futureValue.toFixed(0)} at ${retireAge}`;
          frag.appendChild(span);
  
          lastIndex = offset + match.length;
        });
        // Append remaining text
        frag.appendChild(document.createTextNode(original.slice(lastIndex)));
        n.replaceWith(frag);
      });
    }
  
    annotate();
  
    // Observe DOM mutations (endless scroll etc.)
    const observer = new MutationObserver(() => annotate());
    observer.observe(document.body, { childList: true, subtree: true });
  })();
  