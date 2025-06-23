/* popup.js  – v1.0 */
const $ = (sel) => document.querySelector(sel);

chrome.storage.sync.get(
  { age: 30, retireAge: 65, index: "nasdaq", customRate: 10 },
  (d) => {
    $("#age").value = d.age;
    $("#retireAge").value = d.retireAge;
    $("#index").value = d.index;
    $("#customRate").value = d.customRate;
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
  const customRate = +$("#customRate").value;

  if (retireAge <= age) {
    alert("Retirement age must exceed age—nice try, time-traveller!");
    return;
  }
  if (index === "custom" && (customRate < 1 || customRate > 20)) {
    alert("Custom return must be 1 – 20 %");
    return;
  }

  chrome.storage.sync.set(
    { age, retireAge, index, customRate: customRate / 100 },
    () => {
      alert("Saved!  Refresh any open pages to see updated numbers.");
    }
  );
});
