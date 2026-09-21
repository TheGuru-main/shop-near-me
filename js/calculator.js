window.SNM = window.SNM || {};

SNM.runCalculator = function () {
  var qty = parseFloat(((document.getElementById("calc-qty") || {}).value || "1").trim()) || 0;
  var unit = parseFloat(
    (
      (document.getElementById("calc-price") ||
        document.getElementById("calc-unit") ||
        {}).value || "0"
    ).trim()
  ) || 0;
  var discount = parseFloat(((document.getElementById("calc-discount") || {}).value || "0").trim()) || 0;
  var vatPct = parseFloat(((document.getElementById("calc-vat") || {}).value || "0").trim()) || 0;

  var sub = qty * unit;
  var afterDisc = Math.max(0, sub - discount);
  var vat = afterDisc * (vatPct / 100);
  var total = afterDisc + vat;

  var out =
    document.getElementById("calcTotal") ||
    document.getElementById("calcResult");
  if (out) {
    out.innerHTML =
      "Total: ₦" +
      total.toFixed(2) +
      " <span class='muted small'>(sub ₦" +
      sub.toFixed(2) +
      (discount ? " − disc ₦" + discount.toFixed(2) : "") +
      ")</span>";
  }
  SNM._lastCalcTotal = total;
  return total;
};

SNM.bindCalculator = function () {
  if (SNM._calcBound) return;
  SNM._calcBound = true;
  var btn = document.getElementById("btnCalcRun");
  if (btn) {
    btn.onclick = function () {
      SNM.runCalculator();
    };
  }
};

SNM.onCalculatorEnter = function () {
  SNM.bindCalculator();
};