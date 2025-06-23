/* popup.js – v2.0 (now with enable/disable switch) */
const $ = (sel) => document.querySelector(sel);

chrome.storage.sync.get(
  {
    age: 30,
    retireAge: 65,
    index: "nasdaq",
    customRate: 0.1,
    active: true
  },
  (d) => {
    $("#age").value = d.age;
    $("#retireAge").value = d.retireAge;
    $("#index").value = d.index;
    $("#customRate").value = (d.customRate * 100).toFixed(1);
    $("#active").checked = d.active;
    toggleCustomRow(d.index === "custom");
  }
);

function toggleCustomRow(show) {
  $("#customRateRow").hidden = !show;
}

$("#index").addEventListener("change", () =>
  toggleCustomRow($("#index").value === "custom")
);

$("#save").addEventListener("click", () => {
  const age = +$("#age").value;
  const retireAge = +$("#retireAge").value;
  const index = $("#index").value;
  const customRate = +$("#customRate").value / 100;
  const active = $("#active").checked;

  if (retireAge <= age) {
    return alert("Retirement age must exceed your current age.");
  }
  if (index === "custom" && (customRate < 0.01 || customRate > 0.3)) {
    return alert("Custom return must be 1 % – 30 %.");
  }

  chrome.storage.sync.set(
    { age, retireAge, index, customRate, active },
    () => alert("Saved!  Refresh pages to apply changes.")
  );
});