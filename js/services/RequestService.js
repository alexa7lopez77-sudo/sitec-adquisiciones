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

  /*async create(x) {
    if (this.url) await this.api.json(this.url, x);
    const a = this.list();
    a.push(x);
    Storage.saveList(KEYS.requests, a);
  }*/
  async create(x) {
    console.log("1. Solicitud recibida:", x);

    if (this.url) {
      const response = await this.api.json(this.url, x);
      console.log("2. Respuesta de n8n:", response);
    }

    const requests = this.list();
    console.log("3. Solicitudes almacenadas:", requests);

    if (!Array.isArray(requests)) {
      throw new Error(
        "El almacenamiento de solicitudes no devolvió un arreglo válido.",
      );
    }

    requests.push(x);
    console.log("4. Solicitud añadida:", requests);

    Storage.saveList(KEYS.requests, requests);
    console.log("5. Solicitud guardada correctamente.");

    return {
      success: true,
      request: x,
    };
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
