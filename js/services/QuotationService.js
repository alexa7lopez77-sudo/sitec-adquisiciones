import { CONFIG, KEYS } from "../config.js";
import { Storage } from "../core/Storage.js";
export class QuotationService {
  constructor(api, url) {
    this.api = api;
    this.url = url;
  }
  list() {
    return Storage.list(KEYS.quotes);
  }
  async create(q, photos) {
    if (this.url) {
      const f = new FormData();
      f.append("quotation", JSON.stringify(q));
      photos.forEach((x, i) => f.append(`photo_${i + 1}`, x));
      await this.api.form(this.url, f);
    }
    const a = this.list();
    a.push(q);
    Storage.saveList(KEYS.quotes, a);
  }
  async review(code, decision) {
    const quotes = this.list();
    const index = quotes.findIndex((item) => item.code === code);

    if (index === -1) {
      throw new Error("QUOTE_NOT_FOUND");
    }

    if (!CONFIG.endpoints.quotationReview) {
      throw new Error("REVIEW_URL_NOT_CONFIGURED");
    }

    const quotation = quotes[index];

    const payload = {
      decision,
      quotation,
      requestedAt: new Date().toISOString(),
    };

    const form = new FormData();
    form.append("review", JSON.stringify(payload));

    const result = await this.api.form(CONFIG.endpoints.quotationReview, form);

    if (!result?.success) {
      throw new Error(result?.message || "REVIEW_NOT_PROCESSED");
    }

    const updatedQuotation = {
      ...quotation,
      status: result.status,
      reviewedAt: result.reviewedAt || new Date().toISOString(),
      purchaseOrder: result.purchaseOrder || null,
    };

    quotes[index] = updatedQuotation;
    Storage.saveList(KEYS.quotes, quotes);

    return updatedQuotation;
  }
}
