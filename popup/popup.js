const $ = (id) => document.getElementById(id);

chrome.storage.sync.get({ age: 30, retireAge: 65, returnRate: 10 }, (data) => {
  $("age").value = data.age;
  $("retireAge").value = data.retireAge;
  $("returnRate").value = data.returnRate * 100; // back to %
});

$("save").addEventListener("click", () => {
  const age = parseInt($("age").value, 10);
  const retireAge = parseInt($("retireAge").value, 10);
  const returnRate = parseFloat($("returnRate").value) / 100;

  if (retireAge <= age) {
    alert("Time travel not supported—Retirement age must exceed current age!");
    return;
  }

  chrome.storage.sync.set({ age, retireAge, returnRate }, () => {
    alert("Prefs saved. Refresh any open pages to re-annotate.");
  });
});
