window.SNM = window.SNM || {};
SNM._premiumActive = false;

SNM.loadDocuments = async function () {
  var lock = document.getElementById("premiumLock");
  try {
    var me = await SNM.api("/premium/me");
    SNM._premiumActive = !!(me && (me.active || me.subscribed || (me.plans && me.plans.length)));
  } catch (e) {
    SNM._premiumActive = false;
  }
  if (lock) lock.classList.toggle("hidden", SNM._premiumActive);

  var rl = document.getElementById("receiptList");
  var el = document.getElementById("einvoiceList");
  try {
    var receipts = await SNM.api("/receipts");
    var items = receipts.items || [];
    if (rl) {
      rl.innerHTML = items.length
        ? items.map(function (r) {
            return '<div class="product-card"><div class="title">' + (r.number || r.id) +
              '</div><div class="meta">' + (r.total != null ? r.total + " " + (r.currency || "") : "") + "</div></div>";
          }).join("")
        : "<p class='muted'>No receipts yet</p>";
    }
  } catch (e) {
    if (rl) rl.innerHTML = "<p class='muted'>Receipts unavailable</p>";
  }
  try {
    var inv = await SNM.api("/e-invoices");
    var rows = inv.items || [];
    if (el) {
      el.innerHTML = rows.length
        ? rows.map(function (r) {
            return '<div class="product-card"><div class="title">' + (r.number || r.id) +
              '</div><div class="meta">' + (r.total != null ? r.total : "") + "</div></div>";
          }).join("")
        : "<p class='muted'>No e-invoices yet</p>";
    }
  } catch (e) {
    if (el) el.innerHTML = "<p class='muted'>E-invoices unavailable</p>";
  }
};

SNM.bindDocuments = function () {
  function lines() {
    return [{
      name: (document.getElementById("doc-item-name").value || "").trim(),
      qty: parseFloat(document.getElementById("doc-item-qty").value) || 1,
      unit_price: parseFloat(document.getElementById("doc-item-price").value) || 0
    }];
  }
  var r = document.getElementById("btnCreateReceipt");
  if (r) r.onclick = async function () {
    try {
      await SNM.api("/receipts", {
        method: "POST",
        body: {
          customer_name: document.getElementById("doc-customer").value,
          lines: lines()
        }
      });
      SNM.toast("Receipt saved");
      SNM.loadDocuments();
    } catch (e) { SNM.toast(e.message); }
  };
  async function inv(kind) {
    if (!SNM._premiumActive) {
      SNM.toast("Activate premium for e-invoice");
      SNM.go("premium");
      return;
    }
    try {
      await SNM.api("/e-invoices", {
        method: "POST",
        body: {
          customer_name: document.getElementById("doc-customer").value,
          customer_phone: document.getElementById("doc-customer-phone").value,
          lines: lines(),
          kind: kind
        }
      });
      SNM.toast("E-invoice issued");
      SNM.loadDocuments();
    } catch (e) { SNM.toast(e.message); }
  }
  var i1 = document.getElementById("btnCreateEinvoice");
  var i2 = document.getElementById("btnCreateEinvoicePp");
  if (i1) i1.onclick = function () { inv("e_invoice"); };
  if (i2) i2.onclick = function () { inv("e_invoice_pp"); };
};
