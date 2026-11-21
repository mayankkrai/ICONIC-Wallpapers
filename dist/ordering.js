const orderStyles = {
  botanical: { label: "Botanical", image: "tropical.webp", alt: "Oversized palm leaf wallpaper behind a green velvet chair" },
  floral: { label: "Floral", image: "floral.webp", alt: "Blush peonies and delicate stems on dark wallpaper" },
  texture: { label: "Textured", image: "textures.webp", alt: "Sunlight falling across warm woven wallcovering" },
  geometric: { label: "Geometric", image: "geometric.webp", alt: "Navy and brass Art Deco fan wallpaper beside a gold lamp" },
};
const feetPerUnit = { ft: 1, in: 1 / 12, cm: 1 / 30.48 };
const pricePerSquareFoot = 75;
const basketKey = "iconic-wallpapers-order-v1";
const whatsappNumber = "919266845485";
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const areaNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const dimensionNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 8 });

function wallArea({ width, height, unit, quantity }) {
  return (width * feetPerUnit[unit]) * (height * feetPerUnit[unit]) * quantity;
}

function validWall(item) {
  if (!item || !Object.hasOwn(orderStyles, item.style) || !Object.hasOwn(feetPerUnit, item.unit)) return false;
  if (!Number.isFinite(item.width) || item.width <= 0 || !Number.isFinite(item.height) || item.height <= 0) return false;
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return false;
  const area = wallArea(item);
  return area > 0 && area * pricePerSquareFoot * 100 <= Number.MAX_SAFE_INTEGER;
}

function readBasket() {
  try {
    const items = JSON.parse(localStorage.getItem(basketKey) || "[]");
    if (Array.isArray(items)) return items.filter((item) => validWall(item) && typeof item.id === "string" && typeof item.finish === "string");
  } catch {
    // An unavailable or corrupt draft should not prevent customers from sizing a wall.
  }
  return [];
}

function writeBasket(items) {
  try {
    localStorage.setItem(basketKey, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function displayArea(area) {
  return area < .01 ? "<0.01 sq ft" : `${areaNumber.format(area)} sq ft`;
}

function displayPrice(area) {
  return money.format(area * pricePerSquareFoot);
}

function displaySize(item) {
  const width = dimensionNumber.format(item.width);
  const height = dimensionNumber.format(item.height);
  return `${width} × ${height} ${item.unit}`;
}

function refreshCount(items) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector("[data-order-count]").textContent = count ? `(${count})` : "";
}

function initialiseSizing() {
  const form = document.querySelector("#sizing-form");
  const fields = form.elements;
  const preview = document.querySelector("#style-image");
  const caption = document.querySelector("#style-caption");
  const areaOutput = document.querySelector("#wall-area");
  const priceOutput = document.querySelector("#wall-price");
  const unitLabels = document.querySelectorAll("[data-unit-label]");
  const notice = document.querySelector("#sizing-error");
  const params = new URLSearchParams(window.location.search);
  const edit = readBasket().find((item) => item.id === params.get("edit"));
  const requestedStyle = params.get("style");

  if (edit) {
    for (const field of ["style", "unit", "width", "height", "quantity", "finish"]) {
      fields[field].value = edit[field];
    }
    document.querySelector("#add-wall").textContent = "Save wall changes";
    document.querySelector(".order-heading h1").textContent = "Edit your wall.";
  } else if (Object.hasOwn(orderStyles, requestedStyle)) {
    fields.style.value = requestedStyle;
  }

  let previousUnit = fields.unit.value;

  function draft() {
    return {
      style: fields.style.value,
      unit: fields.unit.value,
      width: fields.width.valueAsNumber,
      height: fields.height.valueAsNumber,
      quantity: fields.quantity.valueAsNumber,
      finish: fields.finish.value.trim(),
    };
  }

  function updateSizing() {
    const selection = draft();
    const style = orderStyles[selection.style];
    const imagePath = `assets/${style.image}`;
    if (preview.getAttribute("src") !== imagePath) preview.src = imagePath;
    preview.alt = style.alt;
    caption.textContent = style.label;
    for (const label of unitLabels) label.textContent = `(${selection.unit})`;
    for (const input of [fields.width, fields.height]) {
      input.setCustomValidity(input.valueAsNumber === 0 ? "Enter a measurement greater than zero." : "");
    }
    const area = validWall(selection) ? wallArea(selection) : null;
    areaOutput.value = area === null ? "—" : displayArea(area);
    priceOutput.value = area === null ? "—" : displayPrice(area);
  }

  fields.unit.addEventListener("change", () => {
    const newUnit = fields.unit.value;
    const ratio = feetPerUnit[previousUnit] / feetPerUnit[newUnit];
    for (const input of [fields.width, fields.height]) {
      if (!Number.isFinite(input.valueAsNumber)) continue;
      const converted = input.valueAsNumber * ratio;
      input.value = Number.isFinite(converted) ? Number(converted.toPrecision(12)) : "";
    }
    previousUnit = newUnit;
    updateSizing();
  });

  form.addEventListener("input", (event) => {
    if (event.target === fields.unit) return;
    notice.hidden = true;
    updateSizing();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = draft();
    if (!validWall(item)) {
      notice.textContent = "Check the measurements and number of walls before adding this selection.";
      notice.hidden = false;
      return;
    }
    const items = readBasket();
    const existing = edit ? items.findIndex((candidate) => candidate.id === edit.id) : -1;
    if (edit && existing === -1) {
      notice.textContent = "This wall was removed from your order. Reopen the sizing page to add it again.";
      notice.hidden = false;
      return;
    }
    item.id = edit ? edit.id : globalThis.crypto.randomUUID();
    if (edit) items[existing] = item;
    else items.push(item);
    if (!writeBasket(items)) {
      notice.textContent = "Your browser could not save this order. Try allowing site storage or call the showroom.";
      notice.hidden = false;
      return;
    }
    window.location.assign("order.html");
  });

  form.hidden = false;
  updateSizing();
  window.addEventListener("pageshow", () => {
    // Restore the unit used by inputs when returning with the browser Back button.
    previousUnit = fields.unit.value;
    updateSizing();
  });
}

function combinedArea(items) {
  return items.reduce((total, item) => total + wallArea(item), 0);
}

function orderMessage(items, { customer, pin, notes }) {
  const lines = [`Hello Iconic Wallpapers, I'd like to place a wallpaper order.`, "", `Name: ${customer}`];
  if (pin) lines.push(`Delivery PIN: ${pin}`);
  lines.push("");
  for (const [index, item] of items.entries()) {
    const style = orderStyles[item.style].label;
    const walls = item.quantity === 1 ? "1 wall" : `${item.quantity} identical walls`;
    lines.push(`${index + 1}. ${style} · ${displaySize(item)} · ${walls} · ${displayArea(wallArea(item))}`);
    if (item.finish) lines.push(`   Finish preference: ${item.finish}`);
  }
  const total = combinedArea(items);
  lines.push("", `Total measured area: ${displayArea(total)}`);
  lines.push(`Wallpaper estimate: ${displayPrice(total)} at ${money.format(pricePerSquareFoot)} per sq ft`);
  if (notes) lines.push("", `Notes: ${notes}`);
  lines.push("", "Please confirm availability, the wall sizes and the final total.");
  return lines.join("\n");
}

function initialiseReview() {
  const empty = document.querySelector("#order-empty");
  const review = document.querySelector("#order-review");
  const list = document.querySelector("#order-lines");
  const template = document.querySelector("#order-line-template");
  const form = document.querySelector("#request-form");
  const messageSection = document.querySelector("#message-review");
  const message = document.querySelector("#order-message");
  const send = document.querySelector("#send-order");
  const copyStatus = document.querySelector("#copy-status");
  const error = document.querySelector("#basket-error");
  let basket = [];

  function hideMessage() {
    messageSection.hidden = true;
    send.removeAttribute("href");
    message.value = "";
    copyStatus.textContent = "";
  }

  function render() {
    basket = readBasket();
    hideMessage();
    refreshCount(basket);
    empty.hidden = basket.length > 0;
    review.hidden = basket.length === 0;
    list.replaceChildren();
    for (const [index, item] of basket.entries()) {
      const style = orderStyles[item.style];
      const line = template.content.firstElementChild.cloneNode(true);
      line.querySelector("img").src = `assets/${style.image}`;
      line.querySelector("h3").textContent = style.label;
      line.querySelector(".line-measure").textContent = `${displaySize(item)} · ${item.quantity} ${item.quantity === 1 ? "wall" : "walls"} · ${displayArea(wallArea(item))}`;
      const finish = line.querySelector(".line-finish");
      finish.hidden = !item.finish;
      finish.textContent = `Finish preference: ${item.finish}`;
      const editLink = line.querySelector("a");
      editLink.href = `wallpaper.html?${new URLSearchParams({ style: item.style, edit: item.id })}`;
      editLink.setAttribute("aria-label", `Edit ${style.label} selection ${index + 1}`);
      const remove = line.querySelector("button");
      remove.dataset.remove = item.id;
      remove.setAttribute("aria-label", `Remove ${style.label} selection ${index + 1}`);
      list.append(line);
    }
    const area = combinedArea(basket);
    document.querySelector("#order-area").value = basket.length ? displayArea(area) : "";
    document.querySelector("#order-price").value = basket.length ? displayPrice(area) : "";
  }

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;
    const index = basket.findIndex((item) => item.id === button.dataset.remove);
    const next = readBasket().filter((item) => item.id !== button.dataset.remove);
    if (!writeBasket(next)) {
      error.textContent = "Your browser could not update the order. Please try again.";
      error.hidden = false;
      return;
    }
    error.hidden = true;
    render();
    const remaining = list.children[Math.min(index, list.children.length - 1)];
    (remaining?.querySelector("a") ?? empty.querySelector("a")).focus();
  });

  form.addEventListener("input", () => {
    form.elements.customer.setCustomValidity("");
    hideMessage();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const details = Object.fromEntries(new FormData(form));
    for (const field of ["customer", "pin", "notes"]) details[field] = details[field].trim();
    if (!details.customer) {
      form.elements.customer.setCustomValidity("Enter your name.");
      form.elements.customer.reportValidity();
      return;
    }
    if (!basket.length) return;
    message.value = orderMessage(basket, details);
    send.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message.value)}`;
    messageSection.hidden = false;
    document.querySelector("#message-title").focus();
  });

  document.querySelector("#copy-order").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(message.value);
      copyStatus.textContent = "Message copied.";
    } catch {
      message.select();
      copyStatus.textContent = "Copy the selected message to paste it into WhatsApp.";
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === basketKey || event.key === null) render();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) render();
  });
  render();
}

const orderPage = document.querySelector("[data-page]").dataset.page;
if (orderPage === "sizing") {
  refreshCount(readBasket());
  window.addEventListener("pageshow", () => refreshCount(readBasket()));
  window.addEventListener("storage", (event) => {
    if (event.key === basketKey || event.key === null) refreshCount(readBasket());
  });
  initialiseSizing();
} else if (orderPage === "order") {
  initialiseReview();
}
