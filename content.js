/* content.js – v2.4  (future value + meme only) */
(() => {
  /* ────────────── CONSTANTS ────────────── */
  const INDEXES = { nasdaq:0.12, sp500:0.10, ftse:0.07, custom:0 };
  const PRICE_RE = /(?:£|\$|€|₹)\s?(?:\d{1,3}(?:[, ]\d{3})*|\d+)(?:\.\d{2})?/g;
  const TIP_ID   = "ptfy-floating-tip";

  /* ────────── PREFS / MEMES ────────── */
  let prefs, memes=[];
  chrome.storage.sync.get(
    { age:30, retireAge:65, index:"nasdaq", customRate:0.10, active:true },
    async d=>{
      prefs=d;
      INDEXES.custom=d.customRate;
      try{ memes=await fetch(chrome.runtime.getURL("memes/memes.json")).then(r=>r.json()); }
      catch{ memes=[]; }
      if(prefs.active){ annotateWholePage(); observeDOM(); }
    }
  );

  /* ───────────── CSS ONCE ───────────── */
  if(!document.getElementById("ptfy-style")){
    const s=document.createElement("style"); s.id="ptfy-style";
    s.textContent=`
      :root{--acc:#0bc;}
      .ptfy-bubble{color:var(--acc)!important;cursor:pointer;display:inline-block;
        transition:transform .15s cubic-bezier(.25,1.5,.5,1);animation:bPop .25s;}
      .ptfy-bubble:hover{transform:scale(1.15);}
      @keyframes bPop{0%{transform:scale(.2);opacity:0}70%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}
      #${TIP_ID}{
        position:fixed;max-width:260px;padding:14px;background:#fff;color:#111;border-radius:14px;
        box-shadow:0 12px 32px rgba(0,0,0,.28);font-family:system-ui,sans-serif;font-size:14px;line-height:1.3;
        display:flex;flex-direction:column;align-items:center;gap:10px;z-index:2147483647;pointer-events:none;
        transform-origin:bottom center;animation:fIn .18s ease-out;}
      @keyframes fIn{0%{opacity:0;transform:translateY(6px) scale(.94)}100%{opacity:1;transform:translateY(0) scale(1)}}
      #${TIP_ID} img{max-width:200px;max-height:140px;border-radius:8px;}
      #${TIP_ID} .cap{font-size:12px;color:#555;text-align:center;}
      #${TIP_ID}::after{content:"";position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
        border:6px solid transparent;border-top-color:#fff;filter:drop-shadow(0 -1px 2px rgba(0,0,0,.12))}
      #${TIP_ID}::before{content:"🎉";position:absolute;top:-12px;right:-10px;font-size:18px;
        animation:wiggle 1.8s ease-in-out infinite alternate;}
      @keyframes wiggle{from{transform:rotate(-20deg);}to{transform:rotate(20deg);}}
    `; document.head.append(s);
  }

  /* ─────────── ANNOTATION ─────────── */
  function annotateWholePage(){
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const arr=[]; while(w.nextNode()) arr.push(w.currentNode); annotate(arr);
  }
  function annotate(nodes){
    const yrs=prefs.retireAge-prefs.age; if(yrs<=0) return;
    const rate=(prefs.index==="custom"?prefs.customRate:INDEXES[prefs.index]);

    nodes.forEach(n=>{
      if(n.parentElement?.closest(".ptfy-bubble")) return;
      PRICE_RE.lastIndex=0; if(!PRICE_RE.test(n.textContent)) return; PRICE_RE.lastIndex=0;

      const frag=document.createDocumentFragment(); let pos=0;
      n.textContent.replace(PRICE_RE,(m,off)=>{
        frag.append(n.ownerDocument.createTextNode(n.textContent.slice(pos,off)));
        const p=parseFloat(m.replace(/[^0-9.]/g,""));
        const fv=p*Math.pow(1+rate,yrs);

        const span=n.ownerDocument.createElement("span");
        span.className="ptfy-bubble";
        span.textContent=m;
        span.dataset.fv=fv;
        span.addEventListener("mouseenter",showTip);
        span.addEventListener("mouseleave",hideTip);
        frag.append(span); pos=off+m.length;
      });
      frag.append(n.ownerDocument.createTextNode(n.textContent.slice(pos)));
      n.replaceWith(frag);
    });
  }
  function observeDOM(){
    let q=false;
    new MutationObserver(muts=>{
      if(q) return; q=true;
      requestAnimationFrame(()=>{ q=false;
        const fresh=[];
        muts.forEach(m=>m.addedNodes.forEach(n=>{
          if(n.nodeType===3) fresh.push(n);
          else if(n.nodeType===1){
            const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);
            while(w.nextNode()) fresh.push(w.currentNode);
          }
        }));
        if(fresh.length) annotate(fresh);
      });
    }).observe(document.body,{childList:true,subtree:true});
  }

  /* ───────────── TOOLTIP ───────────── */
  function showTip(e){
    hideTip();
    const s=e.currentTarget, r=s.getBoundingClientRect();
    const fv=parseFloat(s.dataset.fv);
    const fvTxt="≈ £"+fv.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
    const mObj=memes.length?memes[Math.floor(Math.random()*memes.length)]:null;

    const tip=document.createElement("div"); tip.id=TIP_ID;
    tip.innerHTML=`
      <strong style="font-size:16px;">${fvTxt} at ${prefs.retireAge}</strong>
      ${mObj?`<img src="${chrome.runtime.getURL(mObj.file)}" alt=""><div class="cap">${mObj.caption}</div>`:""}
    `;
    document.body.append(tip);

    const tr=tip.getBoundingClientRect();
    const top=r.top-tr.height-12;
    const left=r.left+r.width/2-tr.width/2;
    tip.style.top =Math.max(8,top)+"px";
    tip.style.left=Math.max(8,Math.min(left,window.innerWidth-tr.width-8))+"px";
  }
  function hideTip(){ document.getElementById(TIP_ID)?.remove(); }
})();