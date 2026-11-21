const menu = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
document.documentElement.classList.add("has-menu");

function setMenu(open) {
  menu.setAttribute("aria-expanded", String(open));
  navigation.classList.toggle("is-open", open);
}

menu.addEventListener("click", () => {
  setMenu(menu.getAttribute("aria-expanded") !== "true");
});
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
});

const filters = document.querySelector(".filters");
if (filters) initialiseGallery(filters);

function initialiseGallery(filters) {
  const cards = Array.from(document.querySelectorAll(".style-card"));
  const status = document.querySelector("#filter-status");
  const filterButtons = Array.from(filters.querySelectorAll("button"));

  filters.hidden = false;
  filters.addEventListener("click", (event) => {
    const selected = event.target.closest("[data-filter]");
    if (!selected) return;

    for (const button of filterButtons) {
      button.setAttribute("aria-pressed", String(button === selected));
    }

    for (const card of cards) {
      card.hidden = selected.dataset.filter !== "all" && card.dataset.style !== selected.dataset.filter;
    }

    const visible = cards.filter((card) => !card.hidden).length;
    status.textContent = visible === 1 ? "Showing one wallpaper style." : `Showing ${visible} wallpaper styles.`;
  });

  const dialog = document.querySelector(".style-dialog");
  const dialogImage = dialog.querySelector("img");
  const dialogTitle = dialog.querySelector("h2");
  const dialogNote = dialog.querySelector(".dialog-note");
  const dialogOrder = dialog.querySelector("[data-dialog-order]");

  if (typeof dialog.showModal === "function") {
    for (const card of cards) {
      const detailButton = card.querySelector(".detail-trigger");
      detailButton.hidden = false;
      detailButton.addEventListener("click", () => {
        const image = card.querySelector("img");
        dialogImage.src = image.src;
        dialogImage.alt = image.alt;
        dialogTitle.textContent = card.querySelector("h3").textContent;
        dialogNote.textContent = card.querySelector(".style-note").textContent;
        dialogOrder.href = card.querySelector(".card-order").href;
        dialog.showModal();
      });
    }
  }
}
