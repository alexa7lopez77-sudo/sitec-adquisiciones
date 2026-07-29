import { CONFIG } from "../config.js";
import { COST_CENTERS } from "../data/catalogs.js";
import { Utils } from "../core/Utils.js";
import { Excel } from "../core/Excel.js";
import { SearchableSelect } from "../core/SearchableSelect.js";
import { Request } from "../models/Request.js";

export class RequestView {
  constructor(service, catalog) {
    this.service = service;
    this.catalog = catalog;
  }

  init() {
    this.centerPicker = new SearchableSelect({
      root: document.getElementById("centerPicker"),
      items: COST_CENTERS,
      placeholder: "Buscar parqueadero...",
      onChange: (value) => {
        document.getElementById("centerValue").value = value;
      },
    });

    this.workPicker = new SearchableSelect({
      root: document.getElementById("workPicker"),
      items: this.catalog.allWorks(),
      placeholder: "Buscar en la lista de trabajos...",
      onChange: (value) => {
        document.getElementById("workValue").value = value;
      },
    });

    document
      .getElementById("requestForm")
      .addEventListener("submit", (event) => this.submit(event));

    document.getElementById("requestForm").addEventListener("reset", () => {
      setTimeout(() => this.resetForm(), 0);
    });

    document
      .getElementById("exportRequests")
      .addEventListener("click", () => this.excel());

    window.addEventListener("sitec:view", () => this.render());

    this.render();
  }

  resetForm() {
    this.centerPicker.clear(false);
    this.workPicker.clear(false);

    document.getElementById("centerValue").value = "";
    document.getElementById("workValue").value = "";

    const message = document.getElementById("requestMessage");

    if (message) {
      message.innerHTML = "";
      message.className = "";
    }
  }

  async submit(event) {
    event.preventDefault();

    const message = document.getElementById("requestMessage");

    if (message) {
      message.textContent = "";
      message.className = "";
    }

    const center = this.centerPicker.getValue();
    const selectedWork = this.workPicker.getValue();

    if (!center || !selectedWork) {
      Utils.message(
        document.getElementById("requestMessage"),
        "Debe seleccionar el centro de costo y el trabajo.",
        "error",
      );
      return;
    }

    /*
     * La actividad y subactividad no se solicitan al usuario.
     * Se obtienen automáticamente desde el catálogo de Operaciones
     * usando el trabajo seleccionado.
     */
    const workMetadata = this.catalog.findWork(selectedWork);

    const request = new Request(this.service.list().length, {
      date: Utils.today(),
      costCenter: center,
      activity: workMetadata.activity,
      activityCode: workMetadata.activityCode,
      subactivity: workMetadata.subactivity,
      work: workMetadata.work,
      observations: document.getElementById("notes").value.trim(),
      createdBy: CONFIG.currentUser.name,
    });

    try {
      await this.service.create(request);

      Utils.message(
        document.getElementById("requestMessage"),
        `Solicitud ${request.code} registrada correctamente.`,
        "success",
      );

      event.currentTarget.reset();
      this.render();
    } catch {
      console.error("Error al registrar la solicitud:", error);
      Utils.message(
        document.getElementById("requestMessage"),
        "No fue posible registrar la solicitud.",
        "error",
      );
    }
  }

  render() {
    const items = this.service.list();
    const requirements = document.getElementById("requirements");

    requirements.innerHTML = items.length
      ? items
          .map(
            (item) => `
          <article class="requirement">
            <button type="button">
              <span>
                <strong>${item.code}</strong> · ${item.date} ·
                ${Utils.status(item.status)}
              </span>
              <i class="fa-solid fa-chevron-down"></i>
            </button>

            <div class="requirement-details">
              <p><b>Centro de costo:</b> ${item.costCenter}</p>
              <p><b>Trabajo:</b> ${item.work}</p>
              <p><b>Observaciones:</b>
                ${item.observations || "Sin observaciones"}
              </p>
            </div>
          </article>
        `,
          )
          .join("")
      : '<p class="empty">Aún no existen requerimientos.</p>';

    requirements.querySelectorAll(".requirement > button").forEach((button) => {
      button.addEventListener("click", () => {
        button.parentElement.classList.toggle("open");
      });
    });

    document.getElementById("requestRows").innerHTML = items
      .map(
        (item) => `
        <tr>
          <td>${item.code}</td>
          <td>${item.date}</td>
          <td>${item.activity || "Asignada automáticamente"}</td>
          <td>${item.work}</td>
          <td>${Utils.status(item.status)}</td>
          <td>${Utils.money(item.totalValue)}</td>
        </tr>
      `,
      )
      .join("");

    document.getElementById("requestEmpty").style.display = items.length
      ? "none"
      : "block";
  }

  excel() {
    Excel.download(
      this.service.list().map((item) => ({
        "Número requerimiento": item.code,
        Fecha: item.date,
        "Centro de costo": item.costCenter,
        "Actividad asignada": item.activity,
        "Subactividad asignada": item.subactivity,
        Trabajo: item.work,
        Estado: item.status,
        "Total valor": item.totalValue,
      })),
      "solicitudes_adquisiciones.xlsx",
      "Solicitudes",
    );
  }
}
