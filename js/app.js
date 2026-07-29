import { CONFIG } from "./config.js";
import { Api } from "./core/Api.js";
import { Router } from "./core/Router.js";
import { CatalogService } from "./services/CatalogService.js";
import { RequestService } from "./services/RequestService.js";
import { SupplierService } from "./services/SupplierService.js";
import { QuotationService } from "./services/QuotationService.js";
import { RequestView } from "./views/RequestView.js";
import { SupplierView } from "./views/SupplierView.js";
document.addEventListener("DOMContentLoaded", () => {
  new Router().init();
  const api = new Api(),
    cat = new CatalogService(),
    rs = new RequestService(api, CONFIG.endpoints.request),
    ss = new SupplierService(api, CONFIG.endpoints.supplier),
    qs = new QuotationService(api, CONFIG.endpoints.quotation),
    rv = new RequestView(rs, cat),
    sv = new SupplierView(ss, qs, rs, cat);
  rv.init();
  sv.init();
  window.updateRequestStatus = (code, status, total = null) => {
    const a = rs.list(),
      x = a.find((i) => i.code === code);
    if (!x) return false;
    x.status = status;
    if (total !== null) x.totalValue = +total;
    localStorage.setItem("sitec_requests", JSON.stringify(a));
    rv.render();
    return true;
  };
  window.updateQuoteStatus = (code, status) => {
    const a = qs.list(),
      x = a.find((i) => i.code === code);
    if (!x) return false;
    x.status = status;
    localStorage.setItem("sitec_quotes", JSON.stringify(a));
    sv.render();
    return true;
  };
});
