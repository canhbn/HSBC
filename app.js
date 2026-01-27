const DEFAULT_PIN = "309019";
const PIN_STORAGE_KEY = "pin_override"; // stores new pin locally on device (since GitHub Pages is read-only)

const topbar = document.getElementById("topbar");
const backBtn = document.getElementById("backBtn");

const screens = {
  s1: document.getElementById("s1"),
  s2: document.getElementById("s2"),
  s3: document.getElementById("s3"),
  s4: document.getElementById("s4"),
  s5: document.getElementById("s5"),
  s6: document.getElementById("s6"),
  s7: document.getElementById("s7"),
  s8: document.getElementById("s8"),
  s9: document.getElementById("s9"),
};

const goPinBtn = document.getElementById("goPin");
const pinError = document.getElementById("pinError");
const submitPin = document.getElementById("submitPin");
const securityBtn = document.getElementById("securityBtn");

const rowCA = document.getElementById("rowCA");
const rowCC = document.getElementById("rowCC");
const logoffBtn = document.getElementById("logoffBtn");
const payTransferBtn = document.getElementById("payTransferBtn");

// Screen 3 amounts
const amountCA = document.getElementById("amountCA");
const amountCC = document.getElementById("amountCC");

// Screen 4 txn DOM
const txnLoading = document.getElementById("txnLoading");
const txnError = document.getElementById("txnError");
const txnContainer = document.getElementById("txnContainer");

// Screen 5 credit txn DOM
const ccLoading = document.getElementById("ccLoading");
const ccError = document.getElementById("ccError");
const ccContainer = document.getElementById("ccContainer");

// Screen 6/7
const changePinMenu = document.getElementById("changePinMenu");
const changePinError = document.getElementById("changePinError");
const changePinOk = document.getElementById("changePinOk");
const savePinBtn = document.getElementById("savePinBtn");

// Screen 8
const optBetween = document.getElementById("optBetween");
const optVietnam = document.getElementById("optVietnam");

// PIN boxes (login)
const pinBoxes = [
  document.getElementById("pin0"),
  document.getElementById("pin1"),
  document.getElementById("pin2"),
  document.getElementById("pin3"),
  document.getElementById("pin4"),
  document.getElementById("pin5"),
];

// PIN boxes (change pin)
const oldBoxes = ["old0","old1","old2","old3","old4","old5"].map(id => document.getElementById(id));
const newBoxes = ["new0","new1","new2","new3","new4","new5"].map(id => document.getElementById(id));

let currentPin = DEFAULT_PIN; // resolved at runtime from localStorage or pin.txt

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
   PIN helpers (6 boxes)
======================= */

function onlyDigit(ch){ return /^[0-9]$/.test(ch); }

function getBoxesValue(boxes){
  return boxes.map(b => (b.value || "").replace(/\D/g,"")).join("");
}

function setBoxCommonAttrs(box){
  box.setAttribute("autocomplete", "off");
  box.setAttribute("autocorrect", "off");
  box.setAttribute("autocapitalize", "off");
  box.setAttribute("spellcheck", "false");
}

function focusBox(boxes, i){
  const idx = Math.max(0, Math.min(5, i));
  boxes[idx].focus();
  boxes[idx].select?.();
}

function clearBoxes(boxes){
  boxes.forEach(b => { b.value = ""; b.classList.remove("filled"); });
}

function wireBoxes(boxes, onUpdate){
  boxes.forEach((box, idx) => {
    setBoxCommonAttrs(box);

    box.addEventListener("input", () => {
      const raw = (box.value || "").replace(/\D/g,"");

      if (raw.length <= 1) {
        box.value = raw;
        onUpdate();
        if (raw.length === 1 && idx < 5) focusBox(boxes, idx + 1);
        return;
      }

      // paste: spread digits
      const digits = raw.split("");
      for (let k = 0; k < digits.length && (idx + k) < 6; k++){
        boxes[idx + k].value = digits[k];
      }
      onUpdate();
      focusBox(boxes, Math.min(5, idx + digits.length));
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        if (box.value) {
          box.value = "";
          onUpdate();
          e.preventDefault();
          return;
        }
        if (idx > 0) {
          boxes[idx - 1].value = "";
          onUpdate();
          focusBox(boxes, idx - 1);
          e.preventDefault();
        }
        return;
      }

      if (e.key === "ArrowLeft") { if (idx > 0) focusBox(boxes, idx - 1); e.preventDefault(); return; }
      if (e.key === "ArrowRight") { if (idx < 5) focusBox(boxes, idx + 1); e.preventDefault(); return; }

      if (e.key === "Enter") {
        // handled by caller (button click)
        e.preventDefault();
        return;
      }

      if (e.key.length === 1 && !onlyDigit(e.key)) e.preventDefault();
    });

    box.addEventListener("focus", () => box.select?.());
  });
}

/* =======================
   Load PIN from pin.txt + local override
======================= */

function getLocalPin(){
  const v = (localStorage.getItem(PIN_STORAGE_KEY) || "").trim();
  return /^[0-9]{6}$/.test(v) ? v : null;
}

async function loadPin(){
  const local = getLocalPin();
  if (local) { currentPin = local; return currentPin; }

  try{
    const res = await fetch("./pin.txt", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    const lines = txt.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    const candidate = (lines[0] || "").trim();
    if (/^[0-9]{6}$/.test(candidate)) currentPin = candidate;
    else currentPin = DEFAULT_PIN;
  } catch {
    currentPin = DEFAULT_PIN;
  }
  return currentPin;
}

/* =======================
   Screen 2 (login) logic
======================= */

function updateLoginUI(){
  pinBoxes.forEach(b => {
    b.value = (b.value || "").replace(/\D/g,"").slice(0,1);
    b.classList.toggle("filled", b.value.length === 1);
  });
  submitPin.disabled = (getBoxesValue(pinBoxes).length !== 6);
  if (!pinError.classList.contains("hidden")) pinError.classList.add("hidden");
}

function resetLogin(){
  clearBoxes(pinBoxes);
  submitPin.disabled = true;
  pinError.classList.add("hidden");
}

async function enterLogin(){
  await loadPin();
  resetLogin();
  showScreen("s2");
  setTimeout(() => focusBox(pinBoxes, 0), 50);
}

/* =======================
   Screen 3 balances from TXT
======================= */

function formatMoneyVND(n){
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? "-" : "") + s + " VND";
}

function parseBalancesTxt(txt){
  const out = new Map();
  txt.split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .forEach(line => {
      const [k, v] = line.split("|").map(x => (x || "").trim());
      const num = Number(v);
      if (k && Number.isFinite(num)) out.set(k, num);
    });
  return out;
}

function applyAmount(el, value){
  el.textContent = formatMoneyVND(value);
  el.classList.remove("pos", "neg");
  el.classList.add(value >= 0 ? "pos" : "neg");
}

async function loadBalances(){
  amountCA.textContent = "—";
  amountCC.textContent = "—";
  amountCA.classList.remove("pos","neg");
  amountCC.classList.remove("pos","neg");

  try{
    const res = await fetch("./balances.txt", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    const m = parseBalancesTxt(txt);

    if (m.has("CA")) applyAmount(amountCA, m.get("CA"));
    if (m.has("CC")) applyAmount(amountCC, m.get("CC"));
  } catch {}
}

/* =======================
   Screen 4 transactions from TXT
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
      return { date, name, amount: Number(amount), ref, desc };
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

  grouped.forEach(([date, items]) => {
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
    const res = await fetch("./transactions_current.txt", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    const rows = parseTransactionsTxt(txt);
    renderTransactions(rows);
  } catch {
    txnError.classList.remove("hidden");
  } finally {
    txnLoading.classList.add("hidden");
  }
}

/* =======================
   Screen 5 transactions from TXT
======================= */
function parseCreditTransactionsTxt(txt){
  return txt
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .map(line => {
      const [date, desc, amount] = line.split("|").map(x => (x || "").trim());
      return { date, desc, amount: Number(amount) };
    })
    .filter(r => r.date && r.desc && Number.isFinite(r.amount));
}

function renderCreditTransactions(rows){
  ccContainer.innerHTML = "";
  const grouped = groupByDate(rows.map(r => ({ ...r, name: r.desc }))); 
  // reuse groupByDate(date) from Screen 4 (expects r.date)

  grouped.forEach(([date, items]) => {
    const chip = document.createElement("div");
    chip.className = "date-chip";
    chip.textContent = date;
    ccContainer.appendChild(chip);

    items.forEach((t) => {
      const card = document.createElement("div");
      card.className = "cc-item";

      const line = document.createElement("div");
      line.className = "cc-line";

      const left = document.createElement("div");
      left.className = "cc-desc";
      left.textContent = t.desc ?? t.name;

      const right = document.createElement("div");
      right.className = "cc-amt " + (t.amount >= 0 ? "pos" : "neg");
      right.textContent = formatVND(t.amount); // reuse formatVND from Screen 4

      line.appendChild(left);
      line.appendChild(right);
      card.appendChild(line);

      ccContainer.appendChild(card);
    });
  });
}

async function loadCreditCardTxns(){
  ccLoading.classList.remove("hidden");
  ccError.classList.add("hidden");
  ccContainer.innerHTML = "";

  try{
    const res = await fetch("./transactions_credit.txt", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    const rows = parseCreditTransactionsTxt(txt);
    renderCreditTransactions(rows);
  } catch(e){
    ccError.classList.remove("hidden");
  } finally {
    ccLoading.classList.add("hidden");
  }
}


/* =======================
   Change PIN (Screen 7)
======================= */

function updateChangePinUI(){
  [...oldBoxes, ...newBoxes].forEach(b => {
    b.value = (b.value || "").replace(/\D/g,"").slice(0,1);
    b.classList.toggle("filled", b.value.length === 1);
  });

  const oldVal = getBoxesValue(oldBoxes);
  const newVal = getBoxesValue(newBoxes);
  savePinBtn.disabled = !(oldVal.length === 6 && newVal.length === 6);

  changePinError.classList.add("hidden");
  changePinOk.classList.add("hidden");
}

function resetChangePin(){
  clearBoxes(oldBoxes);
  clearBoxes(newBoxes);
  savePinBtn.disabled = true;
  changePinError.classList.add("hidden");
  changePinOk.classList.add("hidden");
}

function saveNewPinToLocalStorage(pin){
  localStorage.setItem(PIN_STORAGE_KEY, pin);
  currentPin = pin;
}

/* =======================
   Navigation / handlers
======================= */

goPinBtn.addEventListener("click", () => { enterLogin(); });

securityBtn.addEventListener("click", () => {
  showScreen("s6");
});

changePinMenu.addEventListener("click", async () => {
  await loadPin();
  resetChangePin();
  showScreen("s7");
  setTimeout(() => focusBox(oldBoxes, 0), 50);
});

submitPin.addEventListener("click", async () => {
  await loadPin();

  const v = getBoxesValue(pinBoxes);
  if (v.length !== 6 || v !== currentPin) {
    pinError.textContent = "You've entered your PIN incorrectly. Please try again.";
    pinError.classList.remove("hidden");
    const firstEmpty = pinBoxes.findIndex(b => !b.value);
    focusBox(pinBoxes, firstEmpty === -1 ? 5 : firstEmpty);
    return;
  }

  pinError.classList.add("hidden");
  showScreen("s3");
  loadBalances();
});

logoffBtn.addEventListener("click", () => {
  resetLogin();
  resetChangePin();
  showScreen("s1");
});

// Screen 3 navigation
rowCA.addEventListener("click", () => { showScreen("s4"); loadCurrentAccountTxns(); });
rowCC.addEventListener("click", () => { showScreen("s5"); loadCreditCardTxns(); });

// Pay & transfer
payTransferBtn.addEventListener("click", () => showScreen("s8"));
optBetween.addEventListener("click", () => showScreen("s9"));
optVietnam.addEventListener("click", () => showScreen("s9"));

// Save PIN
savePinBtn.addEventListener("click", async () => {
  await loadPin();

  const oldVal = getBoxesValue(oldBoxes);
  const newVal = getBoxesValue(newBoxes);

  if (oldVal !== currentPin) {
    changePinError.textContent = "You've entered your PIN incorrectly. Please try again.";
    changePinError.classList.remove("hidden");
    changePinOk.classList.add("hidden");
    focusBox(oldBoxes, 0);
    return;
  }

  if (!/^[0-9]{6}$/.test(newVal)) {
    changePinError.textContent = "Please enter a 6-digit PIN.";
    changePinError.classList.remove("hidden");
    changePinOk.classList.add("hidden");
    return;
  }

  saveNewPinToLocalStorage(newVal);
  changePinError.classList.add("hidden");
  changePinOk.classList.remove("hidden");

  // Return to login after a short moment (no async promises)
  setTimeout(() => {
    enterLogin();
  }, 500);
});

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
  wireBoxes(pinBoxes, updateLoginUI);
  wireBoxes(oldBoxes, updateChangePinUI);
  wireBoxes(newBoxes, updateChangePinUI);

  updateLoginUI();
  updateChangePinUI();

  const h = location.hash || "#/s1";
  const m = h.match(/^#\/(s[1-9])$/);
  if (m && screens[m[1]]) showScreen(m[1], true);
  else showScreen("s1", true);

  // Preload pin in background (best-effort)
  loadPin();
})();


