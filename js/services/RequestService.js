import { KEYS } from "../config.js";
import { Storage } from "../core/Storage.js";

export class RequestService {
  constructor(api, url) {
    this.api = api;
    this.url = url;
  }

  list() {
    return Storage.list(KEYS.requests);
  }

  async create(x) {
    if (this.url) await this.api.json(this.url, x);
    const a = this.list();
    a.push(x);
    Storage.saveList(KEYS.requests, a);
  }

  link(q) {
    const a = this.list(),
      r = a.find(
        (x) =>
          x.costCenter === q.costCenter &&
          q.works.includes(x.work) &&
          x.status === "ENVIADA PARA COTIZACION",
      );
    if (r) {
      r.status = "COTIZADA";
      r.totalValue = q.total;
      Storage.saveList(KEYS.requests, a);
    }
  }
}
