// js/calculator.js
window.SNM = window.SNM || {};
SNM.bindCalculator = function () {
  var btn = document.getElementById("btnCalcRun");
  if (!btn) return;
  btn.onclick = function () {
    var sub = parseFloat(document.getElementById("calc-sub").value) || 0;
    var disc = parseFloat(document.getElementById("calc-disc").value) || 0;
    var vat = parseFloat(document.getElementById("calc-vat").value) || 0;
    var afterDisc = sub * (1 - disc / 100);
    var total = afterDisc * (1 + vat / 100);
    var out = document.getElementById("calcOut");
    if (out) out.textContent = "Total: " + total.toFixed(2);
    var price = document.getElementById("doc-item-price");
    if (price) price.value = String(total.toFixed(2));
  };
};
