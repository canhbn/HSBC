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
const pinError = document.getElementById("pinError");
const submitPin = document.getElementById("submitPin");

const rowCA = document.getElementById("rowCA");
const rowCC = document.getElementById("rowCC");

// Screen 4 txn DOM
const txnLoading = document.getElementById("txnLoading");
const txnError = document.getElementById("txnError");
const txnContainer = document.getElementById("txnContainer");

// PIN boxes
const pinBoxes = [
  document.getElementById("pin0"),
  document.getElementById("pin1"),
  document.getElementById("pin2"),
  document.getElementById("pin3"),
  document.getElementById("pin4"),
  document.getElementById("pin5"),
];

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

/* =======================
   PIN logic (6 masked boxes)
======================= */

function onlyDigit(ch){ return /^[0-9]$/.test(ch); }

function getPinValue(){
  return pinBoxes.map(b => (b.value || "").replace(/\D/g,"")).join("");
}

function updatePinUI(){
  pinBoxes.forEach(b => {
    b.value = (b.value || "").replace(/\D/g,"").slice(0,1);
    b.classList.toggle("filled", b.value.length === 1);
  });

  submitPin.disabled = (getPinValue().length !== 6);

  if (!pinError.classList.contains("hidden")) pinError.classList.add("hidden");
}

function clearPin(){
  pinBoxes.forEach(b => { b.value = ""; b.classList.remove("filled"); });
  submitPin.disabled = true;
  pinError.classList.add("hidden");
}

function focusBox(i){
  const idx = Math.max(0, Math.min(5, i));
  pinBoxes[idx].focus();
  pinBoxes[idx].select?.();
}

function wirePinBoxes(){
  pinBoxes.forEach((box, idx) => {
    // keep masked; avoid iOS suggestions
    box.setAttribute("autocomplete", "off");
    box.setAttribute("autocorrect", "off");
    box.setAttribute("autocapitalize", "off");
    box.setAttribute("spellcheck", "false");

    box.addEventListener("input", () => {
      const raw = (box.value || "").replace(/\D/g,"");

      if (raw.length <= 1) {
        box.value = raw;
        updatePinUI();
        if (raw.length === 1 && idx < 5) focusBox(idx + 1);
        return;
      }

      // Spread pasted digits
      const digits = raw.split("");
      for (let k = 0; k < digits.length && (idx + k) < 6; k++){
        pinBoxes[idx + k].value = digits[k];
      }
      updatePinUI();
      focusBox(Math.min(5, idx + digits.length));
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        if (box.value) {
          box.value = "";
          updatePinUI();
          e.preventDefault();
          return;
        }
        if (idx > 0) {
          pinBoxes[idx - 1].value = "";
          updatePinUI();
          focusBox(idx - 1);
          e.preventDefault();
        }
        return;
      }

      if (e.key === "ArrowLeft") { if (idx > 0) focusBox(idx - 1); e.preventDefault(); return; }
      if (e.key === "ArrowRight") { if (idx < 5) focusBox(idx + 1); e.preventDefault(); return; }

      if (e.key === "Enter") {
        if (!submitPin.disabled) submitPin.click();
        e.preventDefault();
        return;
      }

      if (e.key.length === 1 && !onlyDigit(e.key)) e.preventDefault();
    });

    box.addEventListener("focus", () => box.select?.());
  });
}

/* =======================
   Transactions from TXT
======================= */

function formatVND(n){
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-US");
  return (n < 0 ? "-" : "") + s + " VND";
}

function parseTransactionsTxt(txt){
  return txt
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .map(line => {
      const parts = line.split("|").map(x => (x || "").trim());
      const [date, name, amount, ref, desc] = parts;
      return {
        date,
        name,
        amount: Number(amount),
        ref,
        desc
      };
    })
    .filter(r => r.date && r.name && Number.isFinite(r.amount));
}

function groupByDate(rows){
  const m = new Map();
  rows.forEach(r => {
    if (!m.has(r.date)) m.set(r.date, []);
    m.get(r.date).push(r);
  });
  return Array.from(m.entries());
}

function renderTransactions(rows){
  txnContainer.innerHTML = "";
  const grouped = groupByDate(rows);

  grouped.forEach(([date, items], gi) => {
    const chip = document.createElement("div");
    chip.className = "date-chip";
    chip.textContent = date;
    txnContainer.appendChild(chip);

    items.forEach((t, i) => {
      const wrap = document.createElement("div");
      wrap.className = "txn";

      const top = document.createElement("div");
      top.className = "txn-top";

      const left = document.createElement("div");
      left.className = "txn-left";
      left.textContent = t.name;

      const right = document.createElement("div");
      right.className = "txn-right " + (t.amount >= 0 ? "pos" : "neg");
      right.textContent = formatVND(t.amount);

      top.appendChild(left);
      top.appendChild(right);

      wrap.appendChild(top);

      if (t.ref) {
        const sub1 = document.createElement("div");
        sub1.className = "txn-sub";
        sub1.textContent = t.ref;
        wrap.appendChild(sub1);
      }

      if (t.desc) {
        const sub2 = document.createElement("div");
        sub2.className = "txn-sub";
        sub2.textContent = t.desc;
        wrap.appendChild(sub2);
      }

      txnContainer.appendChild(wrap);

      // Optional divider between items of same date (keeps your “mờ” separators)
      if (i < items.length - 1) {
        const d = document.createElement("div");
        d.className = "divider";
        txnContainer.appendChild(d);
      }
    });
  });
}

async function loadCurrentAccountTxns(){
  txnLoading.classList.remove("hidden");
  txnError.classList.add("hidden");
  txnContainer.innerHTML = "";

  try{
    // no-store to avoid stale cache when you edit txt
    const res = await fetch("./transactions_current.txt", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    const rows = parseTransactionsTxt(txt);
    renderTransactions(rows);
  } catch(e){
    txnError.classList.remove("hidden");
  } finally {
    txnLoading.classList.add("hidden");
  }
}

/* =======================
   Navigation / handlers
======================= */

// Screen 1 -> Screen 2
goPinBtn.addEventListener("click", () => {
  clearPin();
  showScreen("s2");
  setTimeout(() => focusBox(0), 50);
});

// Continue (only enabled when 6 digits entered)
submitPin.addEventListener("click", () => {
  const v = getPinValue();
  if (v.length !== 6 || v !== PIN_OK) {
    pinError.textContent = "You've entered your PIN incorrectly. Please try again.";
    pinError.classList.remove("hidden");
    const firstEmpty = pinBoxes.findIndex(b => !b.value);
    focusBox(firstEmpty === -1 ? 5 : firstEmpty);
    return;
  }
  pinError.classList.add("hidden");
  showScreen("s3");
});

// Screen 3 navigation (tap row)
rowCA.addEventListener("click", () => {
  showScreen("s4");
  loadCurrentAccountTxns();
});
rowCC.addEventListener("click", () => showScreen("s5"));

// Back
backBtn.addEventListener("click", () => history.back());

// Browser back/forward
window.addEventListener("popstate", (e) => {
  const st = e.state;
  if (st?.screen && screens[st.screen]) showScreen(st.screen, false);
  else showScreen("s1", false);
});

// Init
(function init(){
  wirePinBoxes();
  updatePinUI();

  const h = location.hash || "#/s1";
  const m = h.match(/^#\/(s[1-5])$/);
  if (m && screens[m[1]]) showScreen(m[1], true);
  else showScreen("s1", true);
})();
