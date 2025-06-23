// We’ll be lazy—just embed the popup JS logic
fetch(chrome.runtime.getURL("../popup/popup.html"))
  .then((r) => r.text())
  .then((html) => {
    document.getElementById("mount").innerHTML = html;
    // Dynamically load popup.js
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("../popup/popup.js");
    document.body.appendChild(s);
  });
