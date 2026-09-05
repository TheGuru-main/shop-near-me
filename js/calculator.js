window.SNM = window.SNM || {};

SNM.runCalculator = function () {
  var qty = parseFloat(((document.getElementById("calc-qty") || {}).value || "1").trim()) || 0;
  var unit = parseFloat(((document.getElementById("calc-unit") || {}).value || "0").trim()) || 0;
  var discount = parseFloat(((document.getElementById("calc-discount") || {}).value || "0").trim()) || 0;
  var vatPct = parseFloat(((document.getElementById("calc-vat") || {}).value || "0").trim()) || 0;

  var sub = qty * unit;
  var afterDisc = Math.max(0, sub - discount);
  var vat = afterDisc * (vatPct / 100);
  var total = afterDisc + vat;

  var out = document.getElementById("calcResult");
  if (out) {
    out.innerHTML =
      "<p><strong>Subtotal:</strong> " + sub.toFixed(2) + "</p>" +
      "<p><strong>After discount:</strong> " + afterDisc.toFixed(2) + "</p>" +
      "<p><strong>VAT:</strong> " + vat.toFixed(2) + "</p>" +
      "<p><strong>Total:</strong> " + total.toFixed(2) + "</p>";
  }

  var priceField = document.getElementById("doc-item-price");
  if (priceField) priceField.value = String(unit);

  var qtyField = document.getElementById("doc-item-qty");
  if (qtyField) qtyField.value = String(qty);

  SNM._lastCalcTotal = total;
  return total;
};

SNM.bindCalculator = function () {
  var btn = document.getElementById("btnCalcRun");
  if (btn) {
    btn.onclick = function () {
      SNM.runCalculator();
    };
  }
  var toDoc = document.getElementById("btnCalcToDocs");
  if (toDoc) {
    toDoc.onclick = function () {
      SNM.runCalculator();
      SNM.showScreen("documents");
    };
  }
};
