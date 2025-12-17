let sectionHistory = [];

function openSection(id) {
  const current = document.querySelector("section.active");

  if (current && current.id !== id) {
    sectionHistory.push(current.id);
    current.classList.remove("active");
  }

  document.getElementById(id).classList.add("active");
}

function goBack() {
  if (sectionHistory.length === 0) return;

  const current = document.querySelector("section.active");
  if (current) current.classList.remove("active");

  const previous = sectionHistory.pop();
  document.getElementById(previous).classList.add("active");
}

/* Tabs / iframes */

const frame = document.getElementById("tool-frame");
const tabs = document.querySelectorAll(".tabs button");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    if (tab.dataset.tool === "inm") {
      frame.src = "espacio-inm/index.html";
    }
    if (tab.dataset.tool === "ra") {
      frame.src = "ra/index.html";
    }
    if (tab.dataset.tool === "sg") {
      frame.src = "sistemas-graficos/index.html";
    }
  });
});
