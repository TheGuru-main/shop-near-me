window.SNM = window.SNM || {};

SNM.runCalculator = function () {
  var sub = parseFloat(document.getElementById("calc-sub")?.value || "0");
  var disc = parseFloat(document.getElementById("calc-disc")?.value || "0");
  var vat = parseFloat(document.getElementById("calc-vat")?.value || "0");
  if (isNaN(sub)) sub = 0;
  if (isNaN(disc)) disc = 0;
  if (isNaN(vat)) vat = 0;
  var afterDisc = sub * (1 - disc / 100);
  var total = afterDisc * (1 + vat / 100);
  var out = document.getElementById("calcOut");
  if (out) {
    out.innerHTML =
      "<strong>Total: " +
      total.toFixed(2) +
      "</strong><br><span class='muted'>After discount: " +
      afterDisc.toFixed(2) +
      "</span>";
  }
  var priceField = document.getElementById("doc-item-price");
  if (priceField) priceField.value = String(total.toFixed(2));
  return total;
};

SNM.bindCalculator = function () {
  document.getElementById("btnCalcRun")?.addEventListener("click", function () {
    SNM.runCalculator();
  });
};
