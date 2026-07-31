import { COST_CENTERS } from "../data/catalogs.js";
import { Utils } from "../core/Utils.js";
import { Excel } from "../core/Excel.js";
import { SearchableSelect } from "../core/SearchableSelect.js";
import { MultiSearchSelect } from "../core/MultiSearchSelect.js";
import { Quotation } from "../models/Quotation.js";

export class SupplierView {
  constructor(supplierService, quoteService, requestService, catalogService) {
    this.supplierService = supplierService;
    this.quoteService = quoteService;
    this.requestService = requestService;
    this.catalogService = catalogService;
  }

  init() {
    this.offerPicker = new MultiSearchSelect({
      root: document.getElementById("offerPicker"),
      items: this.catalogService.allWorks(),
      placeholder: "Buscar en la lista de trabajos...",
      onChange: (values) => {
        document.getElementById("offerValues").value = values.length
          ? JSON.stringify(values)
          : "";
      },
    });

    document.getElementById("orderRows").addEventListener("click", (event) => {
      const button = event.target.closest(".view-order");

      if (!button) return;

      const code = decodeURIComponent(button.dataset.code || "");
      this.viewPurchaseOrder(code);
    });

    document.getElementById("quoteRows").addEventListener("click", (event) => {
      const button = event.target.closest(".approve-quote, .reject-quote");

      if (!button) return;

      const decision = button.classList.contains("approve-quote")
        ? "APROBAR"
        : "RECHAZAR";

      this.reviewQuotation(button.dataset.code, decision);
    });

    this.quoteCenterPicker = new SearchableSelect({
      root: document.getElementById("quoteCenterPicker"),
      items: COST_CENTERS,
      placeholder: "Buscar parqueadero...",
      onChange: (value) =>
        (document.getElementById("quoteCenterValue").value = value),
    });

    this.quoteWorksPicker = new MultiSearchSelect({
      root: document.getElementById("quoteWorksPicker"),
      items: [],
      placeholder: "Buscar trabajos registrados...",
      onChange: (values) => {
        document.getElementById("quoteWorksValues").value = values.length
          ? JSON.stringify(values)
          : "";
      },
    });

    document
      .getElementById("supplierForm")
      .addEventListener("submit", (event) => this.register(event));

    document.getElementById("supplierForm").addEventListener("reset", () => {
      setTimeout(() => {
        this.offerPicker.clear();

        const message = document.getElementById("supplierMessage");
        if (message) {
          message.textContent = "";
          message.className = "";
        }
      }, 0);
    });

    document
      .getElementById("addItem")
      .addEventListener("click", () => this.addRow());

    document
      .getElementById("quoteItems")
      .addEventListener("click", (event) => this.remove(event));

    document
      .getElementById("quoteItems")
      .addEventListener("input", () => this.calc());

    document
      .getElementById("quoteItems")
      .addEventListener("change", () => this.calc());

    document
      .getElementById("quoteForm")
      .addEventListener("submit", (event) => this.quote(event));

    document.getElementById("quoteForm").addEventListener("reset", () => {
      setTimeout(() => this.resetQuoteForm(), 0);
    });

    document
      .getElementById("exportQuotes")
      .addEventListener("click", () => this.excel());

    window.addEventListener("sitec:view", () => {
      this.load();
      this.render();
    });

    this.addRow();
    this.load();
    this.render();
  }

  async register(event) {
    event.preventDefault();

    const message = document.getElementById("supplierMessage");

    if (message) {
      message.textContent = "";
      message.className = "";
    }

    const works = this.offerPicker.getValues();

    if (!works.length) {
      Utils.message(
        document.getElementById("supplierMessage"),
        "Seleccione al menos un producto o trabajo.",
        "error",
      );
      return;
    }

    const ruc = document.getElementById("rucPdf").files[0];
    const bank = document.getElementById("bankPdf").files[0];
    const payment = document.getElementById("payment").value;

    if (!ruc || !bank || !payment) {
      Utils.message(
        document.getElementById("supplierMessage"),
        "Debe adjuntar los dos certificados y seleccionar la forma de pago.",
        "error",
      );
      return;
    }

    try {
      await this.supplierService.register(ruc, bank, payment, works);

      Utils.message(
        document.getElementById("supplierMessage"),
        "REGISTRO REALIZADO CORRECTAMENTE",
        "success",
      );

      this.load();
    } catch (error) {
      Utils.message(
        document.getElementById("supplierMessage"),
        error.message === "INVALID"
          ? "NO SE PUEDE REALIZAR EL REGISTRO PORQUE LOS CERTIFICADOS NO SON VALIDOS"
          : "No fue posible validar los certificados.",
        "error",
      );
    }
  }

  load() {
    const supplier = this.supplierService.current();
    const count = this.quoteService.list().length;

    document.getElementById("quoteDate").value = Utils.today();
    document.getElementById("quoteNumber").value =
      `COTIZACION No. ${String(count).padStart(5, "0")}`;
    document.getElementById("quoteSupplier").value =
      supplier?.businessName || supplier?.customer || "";
    document.getElementById("quotePayment").value =
      supplier?.paymentMethod || "";

    this.quoteWorksPicker.setItems(supplier?.offeredWorks || [], true);
  }

  resetQuoteForm() {
    this.quoteCenterPicker.clear(false);
    this.quoteWorksPicker.clear();

    document.getElementById("quoteCenterValue").value = "";
    document.getElementById("quoteWorksValues").value = "";

    // Limpiar el mensaje de éxito o error de la cotización
    const message = document.getElementById("quoteMessage");

    if (message) {
      message.textContent = "";
      message.className = "";
    }

    this.load();
    this.calc();
  }

  addRow() {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><input class="qty" type="number" min="1" required></td>
      <td><input class="desc" required></td>
      <td><input class="unit" type="number" min="0" step="0.01" required></td>
      <td>
        <select class="vat">
          <option value="0">0%</option>
          <option value="15">15%</option>
        </select>
      </td>
      <td><input class="line" value="0.00" readonly></td>
      <td>
        <button class="delete" type="button">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    document.getElementById("quoteItems").appendChild(row);
  }

  remove(event) {
    const button = event.target.closest(".delete");
    if (!button) return;

    const body = document.getElementById("quoteItems");

    if (body.children.length === 1) {
      alert("Debe existir al menos un ítem.");
      return;
    }

    button.closest("tr").remove();
    this.calc();
  }

  calc() {
    let subtotal0 = 0;
    let subtotal15 = 0;

    document.querySelectorAll("#quoteItems tr").forEach((row) => {
      const total =
        (Number(row.querySelector(".qty").value) || 0) *
        (Number(row.querySelector(".unit").value) || 0);

      row.querySelector(".line").value = total.toFixed(2);

      if (Number(row.querySelector(".vat").value) === 15) {
        subtotal15 += total;
      } else {
        subtotal0 += total;
      }
    });

    const iva15 = subtotal15 * 0.15;
    const total = subtotal0 + subtotal15 + iva15;

    document.getElementById("subtotal0").textContent = Utils.money(subtotal0);
    document.getElementById("subtotal15").textContent = Utils.money(subtotal15);
    document.getElementById("iva15").textContent = Utils.money(iva15);
    document.getElementById("grandTotal").textContent = Utils.money(total);

    return { subtotal0, subtotal15, iva15, total };
  }

  items() {
    return [...document.querySelectorAll("#quoteItems tr")].map((row) => ({
      quantity: Number(row.querySelector(".qty").value),
      description: row.querySelector(".desc").value.trim(),
      unitPrice: Number(row.querySelector(".unit").value),
      vat: Number(row.querySelector(".vat").value),
      finalPrice: Number(row.querySelector(".line").value),
    }));
  }

  async quote(event) {
    event.preventDefault();

    const supplier = document.getElementById("quoteSupplier").value;
    const center = this.quoteCenterPicker.getValue();
    const works = this.quoteWorksPicker.getValues();
    const deliveryDate = document.getElementById("deliveryDate").value;

    if (!supplier) {
      Utils.message(
        document.getElementById("quoteMessage"),
        "Primero registre al proveedor.",
        "error",
      );
      return;
    }

    if (!center || !works.length || !deliveryDate) {
      Utils.message(
        document.getElementById("quoteMessage"),
        "Complete centro de costos, trabajos y fecha de entrega.",
        "error",
      );
      return;
    }

    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }

    const quotation = new Quotation(this.quoteService.list().length, {
      date: Utils.today(),
      supplier,
      paymentMethod: document.getElementById("quotePayment").value,
      costCenter: center,
      works,
      items: this.items(),
      ...this.calc(),
      deliveryDate,
    });

    try {
      await this.quoteService.create(quotation, [
        ...document.getElementById("photos").files,
      ]);

      this.requestService.link(quotation);

      Utils.message(
        document.getElementById("quoteMessage"),
        `${quotation.code} registrada correctamente.`,
        "success",
      );

      this.load();
      this.render();
      window.dispatchEvent(new Event("sitec:view"));
    } catch {
      Utils.message(
        document.getElementById("quoteMessage"),
        "No fue posible registrar la cotización.",
        "error",
      );
    }
  }

  async reviewQuotation(code, decision) {
    const approve = decision === "APROBAR";

    const confirmed = window.confirm(
      approve
        ? `¿Desea aprobar ${code} y generar la orden de compra?`
        : `¿Desea rechazar ${code}?`,
    );

    if (!confirmed) return;

    const message = document.getElementById("quoteReviewMessage");

    try {
      const quotation = await this.quoteService.review(code, decision);

      const orderCode = quotation.purchaseOrder?.code;

      Utils.message(
        message,
        approve
          ? orderCode
            ? `${code} aprobada. Orden ${orderCode} generada correctamente.`
            : `${code} aprobada correctamente.`
          : `${code} rechazada correctamente.`,
        "success",
      );

      this.render();
    } catch (error) {
      console.error("Error al procesar la revisión de la cotización:", error);

      Utils.message(
        message,
        "No fue posible procesar la revisión de la cotización.",
        "error",
      );
    }
  }

  viewPurchaseOrder(code) {
    const quotation = this.quoteService
      .list()
      .find((item) => item.purchaseOrder?.code === code);

    const order = quotation?.purchaseOrder;

    if (!order) {
      alert("No fue posible encontrar la orden de compra seleccionada.");
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const itemRows = (order.items || [])
      .map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const finalPrice = Number(item.finalPrice || quantity * unitPrice);
        const vat = Number(item.vat || 0);

        return `
        <tr>
          <td>${escapeHtml(quantity)}</td>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(Utils.money(unitPrice))}</td>
          <td>${escapeHtml(`${vat}%`)}</td>
          <td>${escapeHtml(Utils.money(finalPrice))}</td>
        </tr>
      `;
      })
      .join("");

    const orderWindow = window.open("", "_blank", "width=1100,height=800");

    if (!orderWindow) {
      alert(
        "El navegador bloqueó la ventana. Habilite las ventanas emergentes para visualizar la orden.",
      );
      return;
    }

    orderWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <title>${escapeHtml(order.code)}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 35px;
            font-family: Arial, sans-serif;
            color: #243b5a;
            background: #f4f7fb;
          }

          .document {
            max-width: 1000px;
            margin: auto;
            padding: 40px;
            background: white;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(30, 61, 98, 0.12);
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }

          .brand {
            font-size: 34px;
            font-weight: bold;
            color: #1674b8;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 27px;
            text-align: right;
          }

          .status {
            display: inline-block;
            padding: 8px 15px;
            border-radius: 20px;
            color: #08775b;
            background: #dff7ed;
            font-weight: bold;
          }

          .information {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px 30px;
            margin-bottom: 28px;
          }

          .information div {
            padding: 12px;
            background: #f6f9fd;
            border-radius: 8px;
          }

          .information strong {
            display: block;
            margin-bottom: 5px;
            color: #1c4f83;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }

          th,
          td {
            padding: 12px;
            border: 1px solid #dbe4ef;
            text-align: left;
          }

          th {
            background: #edf4fd;
            color: #24486d;
          }

          .totals {
            width: 380px;
            margin: 25px 0 0 auto;
          }

          .totals div {
            display: flex;
            justify-content: space-between;
            padding: 10px 12px;
            border-bottom: 1px solid #dbe4ef;
          }

          .totals .total {
            font-size: 20px;
            font-weight: bold;
            color: #155ed1;
            background: #e9f1ff;
          }

          .actions {
            margin-top: 30px;
            text-align: right;
          }

          button {
            padding: 12px 22px;
            border: 0;
            border-radius: 8px;
            background: #2563eb;
            color: white;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
          }

          @media print {
            body {
              padding: 0;
              background: white;
            }

            .document {
              box-shadow: none;
              border-radius: 0;
            }

            .actions {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <main class="document">
          <header class="header">
            <div>
              <div class="brand">SITEC</div>
              <p>UrbaPark – Módulo de Adquisiciones</p>
            </div>

            <div>
              <h1>Orden de compra</h1>
              <strong>${escapeHtml(order.code)}</strong>
              <br /><br />
              <span class="status">${escapeHtml(
                order.status || "GENERADA",
              )}</span>
            </div>
          </header>

          <section class="information">
            <div>
              <strong>Cotización relacionada</strong>
              ${escapeHtml(order.quotationCode)}
            </div>

            <div>
              <strong>Fecha de emisión</strong>
              ${escapeHtml(order.date)}
            </div>

            <div>
              <strong>Proveedor</strong>
              ${escapeHtml(order.supplier)}
            </div>

            <div>
              <strong>Forma de pago</strong>
              ${escapeHtml(order.paymentMethod)}
            </div>

            <div>
              <strong>Centro de costos</strong>
              ${escapeHtml(order.costCenter)}
            </div>

            <div>
              <strong>Fecha de entrega</strong>
              ${escapeHtml(order.deliveryDate || "No especificada")}
            </div>

            <div>
              <strong>Trabajos</strong>
              ${escapeHtml((order.works || []).join(", "))}
            </div>
          </section>

          <h2>Detalle de la orden</h2>

          <table>
            <thead>
              <tr>
                <th>Cantidad</th>
                <th>Descripción</th>
                <th>Precio unitario</th>
                <th>IVA</th>
                <th>Precio final</th>
              </tr>
            </thead>

            <tbody>
              ${
                itemRows ||
                `
                  <tr>
                    <td colspan="5">
                      No existen ítems registrados en esta orden.
                    </td>
                  </tr>
                `
              }
            </tbody>
          </table>

          <section class="totals">
            <div>
              <span>Subtotal 0%</span>
              <strong>${escapeHtml(Utils.money(order.subtotal0 || 0))}</strong>
            </div>

            <div>
              <span>Subtotal 15%</span>
              <strong>${escapeHtml(Utils.money(order.subtotal15 || 0))}</strong>
            </div>

            <div>
              <span>IVA 15%</span>
              <strong>${escapeHtml(Utils.money(order.iva15 || 0))}</strong>
            </div>

            <div class="total">
              <span>Total</span>
              <strong>${escapeHtml(Utils.money(order.total || 0))}</strong>
            </div>
          </section>

          <div class="actions">
            <button type="button" onclick="window.print()">
              Imprimir o guardar como PDF
            </button>
          </div>
        </main>
      </body>
    </html>
  `);

    orderWindow.document.close();
  }

  render() {
    const items = this.quoteService.list();

    document.getElementById("quoteRows").innerHTML = items
      .map(
        (item) => `
      <tr>
        <td>${item.code}</td>
        <td>${item.date}</td>
        <td>${item.costCenter}</td>
        <td>${item.works.join(", ")}</td>
        <td>${Utils.status(item.status)}</td>
        <td>${Utils.money(item.total)}</td>
        <td class="quote-actions">
          ${
            item.status === "COTIZADA"
              ? `
                <button
                type="button"
                class="btn approve-quote"
                data-code="${item.code}"
              >
                <i class="fa-solid fa-check"></i>
                Aprobar
              </button>

              <button
              type="button"
              class="btn reject-quote"
              data-code="${item.code}"
              >
                <i class="fa-solid fa-xmark"></i>
                Rechazar
              </button>
            `
              : `<span>${Utils.status(item.status)}</span>`
          }
        </td>
      </tr>
    `,
      )
      .join("");

    document.getElementById("quoteEmpty").style.display = items.length
      ? "none"
      : "block";

    const orders = items
      .filter((item) => item.purchaseOrder)
      .map((item) => item.purchaseOrder);

    document.getElementById("orderRows").innerHTML = orders
      .map(
        (order) => `
      <tr>
        <td>${order.code || ""}</td>
        <td>${order.quotationCode || ""}</td>
        <td>${order.date || ""}</td>
        <td>${order.supplier || ""}</td>
        <td>${order.costCenter || ""}</td>
        <td>${(order.works || []).join(", ")}</td>
        <td>${Utils.money(order.total || 0)}</td>
        <td>${Utils.status(order.status || "GENERADA")}</td>
        <td>
          <button
            type="button"
            class="btn view-order"
            data-code="${encodeURIComponent(order.code || "")}"
          >
            <i class="fa-solid fa-eye"></i>
            Ver orden
          </button>
        </td>
      </tr>
    `,
      )
      .join("");

    document.getElementById("orderEmpty").style.display = orders.length
      ? "none"
      : "block";
  }

  excel() {
    Excel.download(
      this.quoteService.list().map((item) => ({
        "Número cotización": item.code,
        Fecha: item.date,
        "Centro de costos": item.costCenter,
        Trabajo: item.works.join(", "),
        Estado: item.status,
        "Total valor": item.total,
      })),
      "cotizaciones_adquisiciones.xlsx",
      "Cotizaciones",
    );
  }
}
