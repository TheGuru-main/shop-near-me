/* Shop Near Me — invoice_studio.js
   POST /e-invoices · kind from #inv-kind
*/
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  SNM.issueStudioInvoice = async function () {
    var kindEl = el("inv-kind");
    var kind =
      kindEl && kindEl.value === "e_invoice_pp"
        ? "e_invoice_pp"
        : "e_invoice";
    var customer =
      (el("inv-customer") && el("inv-customer").value.trim()) || "";
    var phone = (el("inv-phone") && el("inv-phone").value.trim()) || null;
    var name =
      (el("inv-item-name") && el("inv-item-name").value.trim()) || "";
    var qty = num(el("inv-item-qty") && el("inv-item-qty").value);
    var price = num(el("inv-item-price") && el("inv-item-price").value);
    var notes = (el("inv-notes") && el("inv-notes").value.trim()) || "";

    if (!name) {
      if (typeof SNM.toast === "function") SNM.toast("Add a line item name");
      return;
    }

    var body = {
      customer_name: customer,
      customer_phone: phone,
      lines: [
        {
          name: name,
          qty: qty || 1,
          unit_price: price,
        },
      ],
      currency: "NGN",
      kind: kind,
      notes: notes,
      surface:
        (el("inv-surface") && el("inv-surface").value) || "Stacked",
      layout: (el("inv-layout") && el("inv-layout").value) || "Standard",
    };

    try {
      var inv = await SNM.api("/e-invoices", {
        method: "POST",
        body: body,
      });
      if (typeof SNM.toast === "function") {
        SNM.toast("Issued " + (inv.number || kind));
      }
      await SNM.loadStudioInvoices();
      if (typeof SNM.loadEInvoices === "function") {
        await SNM.loadEInvoices();
      }
    } catch (e) {
      if (typeof SNM.toast === "function") {
        SNM.toast(e.message || "Issue failed — check premium capacity");
      }
    }
  };

  SNM.loadStudioInvoices = async function () {
    var box = el("invStudioList");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading…</p>';
    try {
      var data = await SNM.api("/e-invoices", { method: "GET" });
      var items = (data && (data.items || data.invoices || data)) || [];
      if (!Array.isArray(items)) items = [];
      if (!items.length) {
        box.innerHTML = '<p class="muted">No e-invoices yet.</p>';
        return;
      }
      box.innerHTML = items
        .map(function (r) {
          return (
            '<article class="feed-card"><strong>' +
            escapeHtml(r.number || r.id) +
            "</strong><p class=\"meta\">" +
            escapeHtml(String(r.total != null ? r.total : "")) +
            " " +
            escapeHtml(r.currency || "NGN") +
            " · " +
            escapeHtml(r.status || "issued") +
            "</p></article>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML =
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>";
    }
  };

  SNM.bindInvoiceStudio = function () {
    var issue = el("btnInvIssue");
    if (issue) {
      issue.onclick = function () {
        SNM.issueStudioInvoice();
      };
    }
    var open = el("btnOpenInvoiceStudio");
    if (open) {
      open.onclick = function () {
        if (typeof SNM.showScreen === "function") {
          SNM.showScreen("invoice-studio");
        }
        SNM.loadStudioInvoices();
      };
    }
  };
})();
