import { Utils } from "./Utils.js";

export class MultiSearchSelect {
  constructor({ root, items = [], placeholder = "Buscar...", onChange = null }) {
    this.root = root;
    this.items = items;
    this.placeholder = placeholder;
    this.onChange = onChange;
    this.values = [];
    this.render();
  }

  render() {
    this.root.innerHTML = `
      <div class="multi-values"></div>
      <div class="picker-input-wrap">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input class="picker-input" type="search"
               placeholder="${this.placeholder}" autocomplete="off">
      </div>
      <div class="picker-dropdown"></div>
    `;

    this.valuesContainer = this.root.querySelector(".multi-values");
    this.input = this.root.querySelector(".picker-input");
    this.dropdown = this.root.querySelector(".picker-dropdown");

    this.input.addEventListener("focus", () => this.filter());
    this.input.addEventListener("input", () => this.filter());

    document.addEventListener("click", event => {
      if (!this.root.contains(event.target)) this.close();
    });

    this.renderValues();
  }

  setItems(items, preserveValues = false) {
    this.items = [...items];
    if (!preserveValues) this.values = [];
    else this.values = this.values.filter(value => this.items.includes(value));
    this.input.value = "";
    this.renderValues();
    this.close();
    this.notify();
  }

  getValues() {
    return [...this.values];
  }

  setValues(values) {
    this.values = [...new Set(values)].filter(value => this.items.includes(value));
    this.renderValues();
    this.notify();
  }

  clear() {
    this.values = [];
    this.input.value = "";
    this.renderValues();
    this.close();
    this.notify();
  }

  filter() {
    const query = Utils.norm(this.input.value);
    const available = this.items
      .filter(item => !this.values.includes(item))
      .filter(item => Utils.norm(item).includes(query))
      .slice(0, 12);

    this.dropdown.innerHTML = available.length
      ? available.map(item => `
          <button class="picker-option" type="button"
                  data-value="${this.escape(item)}">
            <i class="fa-solid fa-plus"></i>
            ${this.escape(item)}
          </button>
        `).join("")
      : '<div class="picker-empty">No se encontraron más resultados.</div>';

    this.dropdown.querySelectorAll(".picker-option").forEach(button => {
      button.addEventListener("click", () => {
        this.add(button.dataset.value);
      });
    });

    this.root.classList.add("open");
  }

  add(value) {
    if (!value || this.values.includes(value)) return;
    this.values.push(value);
    this.input.value = "";
    this.renderValues();
    this.filter();
    this.notify();
  }

  remove(value) {
    this.values = this.values.filter(item => item !== value);
    this.renderValues();
    this.notify();
  }

  renderValues() {
    this.valuesContainer.innerHTML = this.values.map(value => `
      <span class="multi-chip">
        <span>${this.escape(value)}</span>
        <button type="button" data-value="${this.escape(value)}"
                aria-label="Eliminar ${this.escape(value)}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </span>
    `).join("");

    this.valuesContainer.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => this.remove(button.dataset.value));
    });

    this.root.classList.toggle("has-values", this.values.length > 0);
  }

  close() {
    this.root.classList.remove("open");
  }

  notify() {
    if (this.onChange) this.onChange(this.getValues());
  }

  escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
}
