export const CONFIG = {
  demoMode: true,
  currentUser: { name: "Procesos", email: "procesos@urba-park.com" },
  endpoints: {
    supplier:
      "https://sitecdesarrollo-n8n.9hwbyc.easypanel.host/webhook/sitec-registro-proveedor",
    request:
      "https://sitecdesarrollo-n8n.9hwbyc.easypanel.host/webhook/sitec-solicitud-compra",
    quotation:
      "https://sitecdesarrollo-n8n.9hwbyc.easypanel.host/webhook/registro-cotizacion",
  },
};
export const KEYS = {
  requests: "sitec_requests",
  supplier: "sitec_supplier",
  quotes: "sitec_quotes",
};
