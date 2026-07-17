import { Utils } from "./Utils.js";

export class SearchableSelect {
  constructor({ root, items = [], placeholder = "Buscar...", onChange = null }) {
    this.root = root;
    this.items = items;
    this.placeholder = placeholder;
    this.onChange = onChange;
    this.value = "";
    this.disabled = root.classList.contains("disabled");
    this.render();
  }

  render() {
    this.root.innerHTML = `
      <div class="picker-input-wrap">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input class="picker-input" type="search"
               placeholder="${this.placeholder}" autocomplete="off">
        <button class="picker-clear" type="button"
                aria-label="Limpiar selección">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="picker-dropdown"></div>
    `;

    this.input = this.root.querySelector(".picker-input");
    this.dropdown = this.root.querySelector(".picker-dropdown");
    this.clearButton = this.root.querySelector(".picker-clear");

    this.input.disabled = this.disabled;

    this.input.addEventListener("focus", () => this.open());
    this.input.addEventListener("input", () => this.filter());
    this.clearButton.addEventListener("click", () => this.clear());

    document.addEventListener("click", event => {
      if (!this.root.contains(event.target)) this.close();
    });
  }

  setItems(items) {
    this.items = [...items];
    this.clear(false);
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this.input.disabled = disabled;
    this.root.classList.toggle("disabled", disabled);
    if (disabled) this.close();
  }

  setValue(value, notify = true) {
    this.value = value || "";
    this.input.value = this.value;
    this.root.classList.toggle("has-value", Boolean(this.value));
    this.close();
    if (notify && this.onChange) this.onChange(this.value);
  }

  getValue() {
    return this.value;
  }

  clear(notify = true) {
    this.value = "";
    this.input.value = "";
    this.root.classList.remove("has-value");
    this.close();
    if (notify && this.onChange) this.onChange("");
  }

  open() {
    if (this.disabled) return;
    this.filter();
    this.root.classList.add("open");
  }

  close() {
    this.root.classList.remove("open");
  }

  filter() {
    if (this.disabled) return;

    const query = Utils.norm(this.input.value);
    const matches = this.items
      .filter(item => Utils.norm(item).includes(query))
      .slice(0, 12);

    this.dropdown.innerHTML = matches.length
      ? matches.map(item => `
          <button class="picker-option" type="button"
                  data-value="${this.escape(item)}">
            ${this.highlight(item, this.input.value)}
          </button>
        `).join("")
      : '<div class="picker-empty">No se encontraron resultados.</div>';

    this.dropdown.querySelectorAll(".picker-option").forEach(button => {
      button.addEventListener("click", () => {
        this.setValue(button.dataset.value);
      });
    });

    this.root.classList.add("open");
  }

  highlight(text, query) {
    if (!query) return this.escape(text);
    const index = Utils.norm(text).indexOf(Utils.norm(query));
    if (index < 0) return this.escape(text);

    const start = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const end = text.slice(index + query.length);
    return `${this.escape(start)}<mark>${this.escape(match)}</mark>${this.escape(end)}`;
  }

  escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
}
