/* Shop Near Me — calculator.js */
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  SNM.lastCalc = null;

  SNM.runCalculator = function () {
    var subtotal = num(el("calc-subtotal") && el("calc-subtotal").value);
    var discount = num(el("calc-discount") && el("calc-discount").value);
    var vatPct = num(el("calc-vat") && el("calc-vat").value);
    var currency =
      (el("calc-currency") && el("calc-currency").value.trim()) || "NGN";

    var afterDiscount = Math.max(0, subtotal - discount);
    var vatAmt = afterDiscount * (vatPct / 100);
    var total = afterDiscount + vatAmt;

    SNM.lastCalc = {
      subtotal: subtotal,
      discount: discount,
      vat_pct: vatPct,
      vat: vatAmt,
      total: total,
      currency: currency,
    };

    var box = el("calcResult");
    if (box) {
      box.classList.remove("muted");
      box.innerHTML =
        "Subtotal: " +
        currency +
        " " +
        subtotal.toLocaleString() +
        "<br>Discount: " +
        currency +
        " " +
        discount.toLocaleString() +
        "<br>VAT (" +
        vatPct +
        "%): " +
        currency +
        " " +
        vatAmt.toLocaleString() +
        "<br><strong>Total: " +
        currency +
        " " +
        total.toLocaleString() +
        "</strong>";
    }
    return SNM.lastCalc;
  };

  /** Push total into Documents quick-issue unit price (single-line helper). */
  SNM.calcToDocuments = function () {
    var c = SNM.lastCalc || SNM.runCalculator();
    if (el("doc-item-price")) {
      el("doc-item-price").value = String(
        Math.round(c.total * 100) / 100
      );
    }
    if (el("doc-item-qty") && !el("doc-item-qty").value) {
      el("doc-item-qty").value = "1";
    }
    if (el("doc-item-name") && !el("doc-item-name").value.trim()) {
      el("doc-item-name").value = "Calculated total";
    }
    if (typeof SNM.showScreen === "function") SNM.showScreen("documents");
    if (typeof SNM.toast === "function") {
      SNM.toast("Total copied to Documents unit price");
    }
  };

  SNM.calcToInvoice = function () {
    var c = SNM.lastCalc || SNM.runCalculator();
    if (el("inv-item-price")) {
      el("inv-item-price").value = String(
        Math.round(c.total * 100) / 100
      );
    }
    if (el("inv-item-qty") && !el("inv-item-qty").value) {
      el("inv-item-qty").value = "1";
    }
    if (el("inv-item-name") && !el("inv-item-name").value.trim()) {
      el("inv-item-name").value = "Calculated total";
    }
    if (typeof SNM.showScreen === "function") {
      SNM.showScreen("invoice-studio");
    }
    if (typeof SNM.toast === "function") {
      SNM.toast("Total copied to Invoice studio");
    }
  };

  SNM.bindCalculator = function () {
    var run = el("btnCalcRun");
    if (run) {
      run.onclick = function () {
        SNM.runCalculator();
      };
    }
    var toDoc = el("btnCalcToDocuments");
    if (toDoc) {
      toDoc.onclick = function () {
        SNM.calcToDocuments();
      };
    }
    var toInv = el("btnCalcToInvoice");
    if (toInv) {
      toInv.onclick = function () {
        SNM.calcToInvoice();
      };
    }
    var open = el("btnOpenCalculator");
    if (open) {
      open.onclick = function () {
        if (typeof SNM.showScreen === "function") {
          SNM.showScreen("calculator");
        }
      };
    }
  };
})();
