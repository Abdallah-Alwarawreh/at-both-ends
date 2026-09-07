import { COLORS } from "./engine.js";
import { COATS } from "./profile.js";
import { preview } from "./render.js";
import { unlock, mute } from "./audio.js";
const panel = document.getElementById("panel");
let onClose = () => {},
  muted = false;
export function buttons(items, target = document.getElementById("actions")) {
  target.replaceChildren();
  for (let [label, fn, primary] of items) {
    let b = document.createElement("button");
    b.textContent = label;
    if (primary) b.className = "primary";
    b.onclick = () => {
      unlock();
      fn();
    };
    target.append(b);
  }
}
export function closePanel() {
  panel.close();
  onClose();
  onClose = () => {};
}
panel.addEventListener("cancel", (e) => {
  e.preventDefault();
  closePanel();
});
export function showPanel(title, content, items, close = () => {}, kind = "") {
  if (panel.open) panel.close();
  onClose = close;
  panel.className = kind;
  panel.innerHTML =
    '<h2 id="panelTitle"></h2><div class="panelBody"></div><div class="panelActions"></div>';
  panel.querySelector("h2").textContent = title;
  panel.querySelector(".panelBody").innerHTML = content;
  buttons(items, panel.querySelector(".panelActions"));
  if (kind === "results") {
    let sound = document.createElement("button");
    sound.dataset.sound = "";
    sound.className = "resultSound";
    panel.append(sound);
    updateSound();
  }
  panel.showModal();
}
export function updateSound() {
  for (let b of document.querySelectorAll("[data-sound]")) {
    b.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>' +
      (muted
        ? '<path d="m17 9 5 6m0-6-5 6"/>'
        : '<path d="M17 8q5 4 0 8m3-11q7 7 0 14"/>') +
      "</svg>";
    b.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
    b.setAttribute("aria-pressed", String(muted));
    b.onclick = () => {
      unlock();
      muted = mute();
      updateSound();
    };
  }
}
export function customize(profile, save) {
  showPanel(
    "Your unicorn",
    '<canvas id="avatar" width="300" height="170" aria-label="Unicorn preview"></canvas><label class="nameLabel">Name<input id="playerName" maxlength="12" autocomplete="off"></label><div id="looks"></div>',
    [["DONE", closePanel, true]],
    save,
    "customization",
  );
  let name = document.getElementById("playerName");
  name.value = profile.name;
  name.oninput = () => {
    profile.name = name.value;
  };
  const redraw = () => preview(document.getElementById("avatar"), profile);
  for (let [key, label, values] of [
    ["coat", "Coat", COATS],
    ["mane", "Mane", COLORS],
    ["charm", "Style", ["Plain", "Star", "Flower"]],
  ]) {
    let row = document.createElement("fieldset"),
      legend = document.createElement("legend");
    legend.textContent = label;
    row.append(legend);
    values.forEach((value, i) => {
      let b = document.createElement("button");
      b.type = "button";
      b.setAttribute(
        "aria-label",
        key === "charm" ? value : label + " " + (i + 1),
      );
      b.setAttribute("aria-pressed", String(profile[key] === i));
      if (key === "charm") b.textContent = value;
      else {
        b.className = "swatch";
        b.style.setProperty("--swatch", value);
      }
      b.onclick = () => {
        profile[key] = i;
        row
          .querySelectorAll("button")
          .forEach((x, j) => x.setAttribute("aria-pressed", String(i === j)));
        redraw();
      };
      row.append(b);
    });
    document.getElementById("looks").append(row);
  }
  redraw();
}
