const PIN_OK = "309019";

const topbar = document.getElementById("topbar");
const backBtn = document.getElementById("backBtn");

const screens = {
  s1: document.getElementById("s1"),
  s2: document.getElementById("s2"),
  s3: document.getElementById("s3"),
  s4: document.getElementById("s4"),
  s5: document.getElementById("s5"),
};

const goPinBtn = document.getElementById("goPin");
const pinInput = document.getElementById("pinInput");
const pinError = document.getElementById("pinError");
const submitPin = document.getElementById("submitPin");

const rowCA = document.getElementById("rowCA");
const rowCC = document.getElementById("rowCC");

function showScreen(id, push=true){
  Object.values(screens).forEach(el => el.classList.add("hidden"));
  screens[id].classList.remove("hidden");

  // Hide topbar completely on Screen 3
  if (id === "s3") topbar.classList.add("hidden-all");
  else topbar.classList.remove("hidden-all");

  // Back button visible except screen 1
  backBtn.classList.toggle("hidden", id === "s1");

  if (push) history.pushState({screen:id}, "", `#/${id}`);
}

function sanitizePin(v){
  return (v || "").replace(/\D/g, "").slice(0, 6);
}

// Screen 1 -> Screen 2
goPinBtn.addEventListener("click", () => {
  pinError.classList.add("hidden");
  pinInput.value = "";
  showScreen("s2");
  setTimeout(() => pinInput.focus(), 50);
});

// Screen 2 input
pinInput.addEventListener("input", () => {
  const clean = sanitizePin(pinInput.value);
  if (pinInput.value !== clean) pinInput.value = clean;
  if (!pinError.classList.contains("hidden")) pinError.classList.add("hidden");
});

pinInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitPin.click();
});

submitPin.addEventListener("click", () => {
  const v = sanitizePin(pinInput.value);
  if (v.length !== 6 || v !== PIN_OK) {
    pinError.textContent = "You've entered your PIN incorrectly. Please try again.";
    pinError.classList.remove("hidden");
    return;
  }
  pinError.classList.add("hidden");
  showScreen("s3");
});

// Screen 3 navigation (tap row)
rowCA.addEventListener("click", () => showScreen("s4"));
rowCC.addEventListener("click", () => showScreen("s5"));

// Back
backBtn.addEventListener("click", () => history.back());

// Browser back/forward
window.addEventListener("popstate", (e) => {
  const st = e.state;
  if (st?.screen && screens[st.screen]) {
    showScreen(st.screen, false);
  } else {
    showScreen("s1", false);
  }
});

// Initial load
(function init(){
  const h = location.hash || "#/s1";
  const m = h.match(/^#\/(s[1-5])$/);
  if (m && screens[m[1]]) showScreen(m[1], true);
  else showScreen("s1", true);
})();
