const canvas = document.getElementById("canvas");
const panel = document.getElementById("panel");
const dataSheet = document.getElementById("dataSheet");
const bottomDrawer = document.getElementById("bottomDrawer");
const toolGrid = document.getElementById("toolGrid");
const lineToolGrid = document.getElementById("lineToolGrid");
const specialToolGrid = document.getElementById("specialToolGrid");
const moreMenu = document.getElementById("moreMenu");
const deleteBtn = document.getElementById("deleteBtn");
const aiPanel = document.getElementById("aiPanel");
const aiBody = document.getElementById("aiBody");
const infoPanel = document.getElementById("infoPanel");
const exportStage = document.getElementById("exportStage");
const acceptDraw = document.getElementById("acceptDraw");

const fieldIds = [
  "hospitalName","opdNo","date","doctorName","patientName","age",
  "sex","address","mobile","diagnosis","reason"
];

const shapeTools = [
  ["male","Male"],
  ["female","Female"],
  ["unknown","Unknown"],
  ["triangle","Triangle"],
  ["maleN","Male N"],
  ["femaleN","Female N"],
  ["unknownN","Unknown N"],
  ["triangleN","Triangle N"],
  ["maleD","Male D"],
  ["femaleD","Female D"],
  ["surrogate","Surrogate"],
  ["unknownP","Unknown P"],
  ["pregnancy","Pregnancy"],
  ["ectopic","Ectopic"],
  ["top","TOP"],
  ["sab","SAB"],
  ["freeText","Free Text"]
];

const lineTools = [
  ["marriage","Marriage"],
  ["consang","Consang"],
  ["sibling","Sibling"],
  ["separated","Separated"],
  ["vertical","Vertical"],
  ["nochild","No child"],
  ["infertile","Infertility"],
  ["diag45","45°"],
  ["diag135","135°"],
  ["diag45d","45° d"],
  ["diag135d","135° d"],
  ["bracket","Bracket"]
];

const specialTools = [
  ["question","?"],
  ["roman1","I"],
  ["roman2","II"],
  ["roman3","III"],
  ["roman4","IV"],
  ["roman5","V"],
  ["roman6","VI"],
  ["roman7","VII"],
  ["roman8","VIII"],
  ["roman9","IX"],
  ["roman10","X"]
];

let currentTool = null;
let selected = null;
let triClipSeq = 0;

let dragging = null;
let dragPointerId = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragMoved = false;
let dragDownX = 0;
let dragDownY = 0;

let history = [];
let historyIndex = -1;
let restoring = false;
let drawingEnabled = false;

function $(id){ return document.getElementById(id); }

function closeMenus(){
  moreMenu.classList.remove("show");
}

function toggleData(){
  dataSheet.classList.toggle("show");
  closeMenus();
}

function toggleTools(forceOpen = null){
  const next = forceOpen === null ? !bottomDrawer.classList.contains("open") : !!forceOpen;
  bottomDrawer.classList.toggle("open", next);
  if (next) hideInfoPanel();
  closeMenus();
}

function showInfoPanel(){
  infoPanel.classList.add("show");
  document.documentElement.style.setProperty("--info-h", "320px");
  bottomDrawer.classList.remove("open");
  closeMenus();
}

function hideInfoPanel(){
  infoPanel.classList.remove("show");
  document.documentElement.style.setProperty("--info-h", "0px");
}

function toggleInfoPanel(){
  if (infoPanel.classList.contains("show")) hideInfoPanel();
  else showInfoPanel();
}

function updateDrawingGate(){
  drawingEnabled = !!acceptDraw.checked;
  const gate = document.getElementById("drawGate");
  if (gate){
    gate.style.display = drawingEnabled ? "none" : "block";
  }
}

function setActiveToolButton(tool){
  document.querySelectorAll(".toolBtn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tool === tool);
  });
}

function toolKeyHandler(e){
  if ((e.key === "Enter" || e.key === " ") && e.currentTarget.classList.contains("toolBtn")){
    e.preventDefault();
    e.currentTarget.click();
  }
}

function buildToolButtons(){
  toolGrid.innerHTML = "";

  const header = document.createElement("div");
  header.className = "toolSection";
  header.textContent = "Symbols";
  toolGrid.appendChild(header);

  shapeTools.forEach(([tool, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toolBtn";
    btn.dataset.tool = tool;
    btn.innerHTML = `
      <div class="toolIcon">${toolIconHTML(tool)}</div>
      <div>${label}</div>
    `;
    btn.addEventListener("click", () => selectTool(tool));
    btn.addEventListener("keydown", toolKeyHandler);
    toolGrid.appendChild(btn);
  });
}

function buildLineButtons(){
  lineToolGrid.innerHTML = "";
  lineTools.forEach(([tool, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inlineToolBtn toolBtn";
    btn.dataset.tool = tool;
    btn.innerHTML = `
      <div class="toolIcon">${toolIconHTML(tool)}</div>
      <div>${label}</div>
    `;
    btn.addEventListener("click", () => selectTool(tool));
    btn.addEventListener("keydown", toolKeyHandler);
    lineToolGrid.appendChild(btn);
  });
}

function buildSpecialButtons(){
  specialToolGrid.innerHTML = "";
  specialTools.forEach(([tool, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inlineToolBtn toolBtn";
    btn.dataset.tool = tool;
    btn.innerHTML = `
      <div class="toolIcon">${toolIconHTML(tool)}</div>
      <div>${label}</div>
    `;
    btn.addEventListener("click", () => selectTool(tool));
    btn.addEventListener("keydown", toolKeyHandler);
    specialToolGrid.appendChild(btn);
  });
}

function toolIconHTML(tool){
  switch(tool){
    case "male":
      return `<div class="icon-square"></div>`;
    case "female":
      return `<div class="icon-circle"></div>`;
    case "unknown":
      return `<div class="icon-diamond"></div>`;
    case "triangle":
      return `<div class="icon-triangle"></div>`;
    case "maleN":
      return `<div class="icon-square" style="position:relative;">
                <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">N</span>
              </div>`;
    case "femaleN":
      return `<div class="icon-circle" style="position:relative;">
                <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">N</span>
              </div>`;
    case "unknownN":
      return `<div class="icon-diamond" data-letter="N"></div>`;
    case "triangleN":
      return `<div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
                <div class="icon-triangle" style="position:absolute;transform:translateY(-2px);"></div>
                <span style="position:relative;z-index:2;font-size:10px;font-weight:700;margin-top:4px;">N</span>
              </div>`;
    case "maleD":
      return `<div class="icon-square" style="position:relative;">
                <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#c00;font-weight:700;">D</span>
              </div>`;
    case "femaleD":
      return `<div class="icon-circle" style="position:relative;">
                <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#c00;font-weight:700;">D</span>
              </div>`;
    case "surrogate":
      return `<div class="icon-circle" style="position:relative;background:#e7ffe7;">
                <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">S</span>
              </div>`;
    case "unknownP":
      return `<div class="icon-diamond" data-letter="P"></div>`;
    case "question":
      return `<div style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;line-height:1;">?</div>`;
    case "roman1":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">I</div>`;
    case "roman2":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">II</div>`;
    case "roman3":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">III</div>`;
    case "roman4":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">IV</div>`;
    case "roman5":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">V</div>`;
    case "roman6":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">VI</div>`;
    case "roman7":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">VII</div>`;
    case "roman8":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">VIII</div>`;
    case "roman9":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">IX</div>`;
    case "roman10":
      return `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">X</div>`;
    case "pregnancy":
      return `<div class="icon-triangle"></div>`;
    case "sab":
      return `<div class="icon-triangle"></div>`;
    case "top":
      return `<div class="icon-triangle fill"></div>`;
    case "ectopic":
      return `<div class="icon-triangle"></div>`;
    case "marriage":
      return `<div class="icon-line"></div>`;
    case "consang":
      return `<div class="icon-line double"></div>`;
    case "separated":
      return `<div style="position:relative;width:42px;height:18px;overflow:hidden;">
                <span style="position:absolute;left:10px;top:2px;width:2px;height:16px;background:#111;transform:rotate(135deg);transform-origin:center;"></span>
                <span style="position:absolute;left:22px;top:2px;width:2px;height:16px;background:#111;transform:rotate(135deg);transform-origin:center;"></span>
              </div>`;
    case "vertical":
      return `<div class="icon-vline"></div>`;
    case "sibling":
      return `<div style="width:44px;height:2px;background:#111;"></div>`;
    case "nochild":
      return `<div class="icon-vline" style="position:relative;">
                <span style="position:absolute;left:-9px;bottom:0;width:20px;height:2px;background:#111;"></span>
              </div>`;
    case "infertile":
      return `<div class="icon-vline" style="position:relative;">
                <span style="position:absolute;left:-9px;bottom:6px;width:20px;height:2px;background:#111;"></span>
              </div>`;
    case "bracket":
      return `<div class="icon-bracket"></div>`;
    case "diag45":
      return `<div class="icon-diag d45"></div>`;
    case "diag135":
      return `<div class="icon-diag d135"></div>`;
    case "diag45d":
      return `<div class="icon-diag dashed d45"></div>`;
    case "diag135d":
      return `<div class="icon-diag dashed d135"></div>`;
    case "freeText":
      return `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:20px;border:1.5px dashed #111;border-radius:6px;font-size:11px;font-weight:700;">T</div>`;
    default:
      return `<div class="icon-symbol">•</div>`;
  }
}

function shapeInner(type){
  const baseMark =
    (type === "maleN" || type === "femaleN" || type === "unknownN") ? "N" :
    (type === "surrogate") ? "S" :
    (type === "maleD" || type === "femaleD") ? "D" :
    (type === "unknownP") ? "P" :
    (type === "question") ? "?" : "";

  return `<span class="shadeLayer"></span>${baseMark ? `<span class="mark">${baseMark}</span>` : ""}`;
}

function triInner(label){
  const clipId = `triClip_${++triClipSeq}`;
  return `
    <span class="shadeLayer"></span>
    <svg viewBox="0 0 100 90" aria-hidden="true" preserveAspectRatio="none">
      <g>
        <rect class="triBase" x="0" y="0" width="100" height="90"></rect>
        <rect class="band band1" x="0" y="0" width="100" height="90"></rect>
        <rect class="band band2" x="50" y="0" width="50" height="90"></rect>
        <rect class="band band3" x="66.666" y="0" width="33.334" height="90"></rect>
        <rect class="band band4" x="75" y="0" width="25" height="90"></rect>
        <rect class="band band5" x="80" y="0" width="20" height="90"></rect>
      </g>
      <path d="M0,0 L100,0 L100,90 L0,90 Z M50,5 L95,85 L5,85 Z" fill="#fff" fill-rule="evenodd"></path>
      <polygon class="stroke" points="50,5 95,85 5,85"></polygon>
    </svg>
    ${label ? `<div class="triLabel">${escapeHtml(label)}</div>` : ``}
  `;
}

function romanLabel(type){
  const map = {
    roman1: "I",
    roman2: "II",
    roman3: "III",
    roman4: "IV",
    roman5: "V",
    roman6: "VI",
    roman7: "VII",
    roman8: "VIII",
    roman9: "IX",
    roman10: "X"
  };
  return map[type] || "";
}

function attachObjectEvents(el){
  el.onpointerdown = onObjectPointerDown;
  el.onkeydown = toolKeyHandler;
  el.tabIndex = 0;
  el.setAttribute("role", "button");
}

function createObject(type, x, y){
  let el;

  const shapeTypes = ["male","female","unknown","maleN","femaleN","unknownN","maleD","femaleD","surrogate","unknownP","question","roman1","roman2","roman3","roman4","roman5","roman6","roman7","roman8","roman9","roman10"];
  const triTypes = ["triangle","triangleN","pregnancy","sab","top","ectopic"];
  const lineTypes = ["marriage","consang","separated","vertical","sibling","nochild","infertile","bracket","diag45","diag135","diag45d","diag135d"];

  if (type === "freeText"){
    el = document.createElement("div");
    el.className = "obj freeText";
    el.dataset.type = type;
    const entered = prompt("Enter free text", "Text") || "Text";
    const safe = escapeHtml(entered.trim() || "Text");
    el.innerHTML = `<span class="mark">${safe}</span>`;
    el.style.minWidth = Math.max(56, Math.min(180, 18 + (entered.trim().length * 7))) + "px";
    el.style.height = "30px";
  } else if (shapeTypes.includes(type)){
    el = document.createElement("div");
    el.className = `obj shape ${type}`;
    el.dataset.type = type;

    if (type === "male") el.classList.add("male");
    if (type === "female") el.classList.add("female");
    if (type === "maleN") el.classList.add("maleN");
    if (type === "femaleN") el.classList.add("femaleN");
    if (type === "unknownN") el.classList.add("unknownN");
    if (type === "maleD") el.classList.add("maleD");
    if (type === "femaleD") el.classList.add("femaleD");
    if (type === "surrogate") el.classList.add("surrogate");
    if (type === "unknownP") el.classList.add("unknownP");
    if (type === "unknown") el.classList.add("unknown");
    if (type === "question") el.classList.add("question");
    if (type.startsWith("roman")) el.classList.add("roman");

    if (type.startsWith("roman")) {
      el.className = `obj roman ${type}`;
      el.innerHTML = `<span class="mark">${romanLabel(type)}</span>`;
    } else {
      el.innerHTML = shapeInner(type);
    }
  } else if (triTypes.includes(type)){
    el = document.createElement("div");
    el.className = `obj tri ${type}`;
    el.dataset.type = type;
    const label = type === "triangleN" ? "N" : (type === "pregnancy" ? "PREG" : type === "sab" ? "SAB" : type === "top" ? "TOP" : type === "ectopic" ? "ECTOPIC" : "");
    el.innerHTML = triInner(label);
    if (type === "top") el.classList.add("top");
  } else if (lineTypes.includes(type)){
    el = document.createElement("div");
    el.className = `obj line ${type}`;
    el.dataset.type = type;
  } else {
    return null;
  }

  el.style.left = x + "px";
  el.style.top = y + "px";

  if (type === "male" || type === "female" || type === "maleD" || type === "femaleD" || type === "surrogate" || type === "unknown" || type === "unknownP"){
    el.style.width = "44px";
    el.style.height = "44px";
  }

  if (type === "question"){
    el.style.width = "18px";
    el.style.height = "18px";
  }
  if (type.startsWith("roman")){
    el.style.width = Math.max(22, (romanLabel(type).length * 8) + 10) + "px";
    el.style.height = "22px";
  }

  if (type === "freeText"){
    el.style.width = el.style.width || "72px";
    el.style.height = "30px";
  }

  if (type === "triangle" || type === "triangleN" || type === "pregnancy" || type === "sab" || type === "top" || type === "ectopic"){
    el.style.width = "48px";
    el.style.height = "54px";
  }

  if (type === "marriage" || type === "consang" || type === "diag45" || type === "diag135" || type === "diag45d" || type === "diag135d"){
    el.style.width = "64px";
    el.style.height = "2px";
  }

  if (type === "sibling"){
    el.style.width = "128px";
    el.style.height = "2px";
  }

  if (type === "separated"){
    el.style.width = "84px";
    el.style.height = "20px";
  }

  if (type === "bracket"){
    el.style.width = "118px";
    el.style.height = "74px";
  }

  if (type === "vertical" || type === "nochild" || type === "infertile"){
    el.style.width = "2px";
    el.style.height = "64px";
  }

  attachObjectEvents(el);
  canvas.appendChild(el);
  updateDeleteButton();
  return el;
}

function selectElement(el){
  if (selected) selected.style.outline = "";
  selected = el;
  if (selected) selected.style.outline = "2px solid #2b6cff";
  updateDeleteButton();

  if (selected && (selected.classList.contains("shape") || selected.classList.contains("tri"))){
    showPanelFor(selected);
  } else {
    panel.style.display = "none";
  }
}

function showPanelFor(el){
  panel.style.display = "block";
  const count = parseInt(
    el.dataset.count ||
    (el.classList.contains("affected5") ? 5 :
     el.classList.contains("affected4") ? 4 :
     el.classList.contains("affected3") ? 3 :
     el.classList.contains("affected2") ? 2 :
     el.classList.contains("affected") ? 1 : 1),
    10
  ) || 1;
  $("pAffected").checked = el.classList.contains("affected") || el.classList.contains("affected2") || el.classList.contains("affected3") || el.classList.contains("affected4") || el.classList.contains("affected5") || el.classList.contains("counted") || el.classList.contains("oldsymptoms");
  $("pSymCount").value = Math.max(1, Math.min(5, count));
  $("pDeath").checked = el.classList.contains("death");
  $("pStill").checked = el.classList.contains("stillmark");
  $("pProband").checked = el.classList.contains("proband");
  $("pConsult").checked = el.classList.contains("consult");
  $("pDocEval").checked = el.classList.contains("documented");
  $("pCarrier").checked = el.classList.contains("carrier");
  $("pAsymp").checked = el.classList.contains("asymp");
  const c = el.querySelector(".comment");
  $("pComment").value = c ? c.innerText : "";
}

function hidePanel(){
  panel.style.display = "none";
}

function selectTool(tool){
  if (tool === "lock" && selected){
    selected.classList.toggle("locked");
    closeMenus();
    return;
  }

  if (currentTool === tool){
    currentTool = null;
    setActiveToolButton(null);
    closeMenus();
    return;
  }

  currentTool = tool;
  setActiveToolButton(tool);
  closeMenus();
}

function getCanvasPoint(e){
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getConnectorPoints(el, xOverride = null, yOverride = null){
  const x = xOverride !== null ? xOverride : (parseFloat(el.style.left) || 0);
  const y = yOverride !== null ? yOverride : (parseFloat(el.style.top) || 0);
  const w = el.offsetWidth || 44;
  const h = el.offsetHeight || 44;
  const type = el.dataset.type || "";

  if (el.classList.contains("shape")){
    return [
      { x: x + w/2, y: y },
      { x: x + w/2, y: y + h },
      { x: x, y: y + h/2 },
      { x: x + w, y: y + h/2 },
      { x: x + w/2, y: y + h/2 }
    ];
  }

  if (el.classList.contains("freeText")){
    return [{ x: x + w/2, y: y + h/2 }];
  }

  if (el.classList.contains("tri")){
    return [
      { x: x + w/2, y: y },
      { x: x, y: y + h },
      { x: x + w, y: y + h },
      { x: x + w/2, y: y + h/2 }
    ];
  }

  if (el.classList.contains("line")){
    if (["vertical","nochild","infertile"].includes(type)){
      return [
        { x: x + 1, y: y },
        { x: x + 1, y: y + h }
      ];
    }

    if (["marriage","consang","separated","sibling","bracket","diag45","diag135","diag45d","diag135d"].includes(type)){
      return [
        { x: x, y: y + 1 },
        { x: x + w, y: y + 1 }
      ];
    }
  }

  return [{ x: x + w/2, y: y + h/2 }];
}

function snapPosition(el, proposedX, proposedY){
  const myPoints = getConnectorPoints(el, proposedX, proposedY);
  const others = Array.from(canvas.children).filter(o => o !== el && o.classList.contains("obj"));
  const threshold = 12;

  let best = null;

  for (const p of myPoints){
    for (const other of others){
      const pts = getConnectorPoints(other);
      for (const q of pts){
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= threshold && (!best || dist < best.dist)){
          best = { dx, dy, dist };
        }
      }
    }
  }

  if (!best) return { x: proposedX, y: proposedY };
  return { x: proposedX + best.dx, y: proposedY + best.dy };
}

function commitHistory(){
  if (restoring) return;

  const state = {
    fields: Object.fromEntries(fieldIds.map(id => [id, $(id).value])),
    objects: Array.from(canvas.children).map(el => ({
      className: el.className,
      datasetType: el.dataset.type || "",
      datasetCount: el.dataset.count || "",
      style: el.style.cssText || "",
      innerHTML: el.innerHTML || ""
    }))
  };

  history = history.slice(0, historyIndex + 1);
  history.push(state);
  historyIndex = history.length - 1;
}

function restoreState(state){
  restoring = true;
  try{
    fieldIds.forEach(id => { $(id).value = state.fields?.[id] ?? ""; });
    canvas.innerHTML = "";
    (state.objects || []).forEach(spec => {
      const el = document.createElement("div");
      el.className = spec.className || "obj";
      if (spec.datasetType) el.dataset.type = spec.datasetType;
      if (spec.datasetCount) el.dataset.count = spec.datasetCount;
      el.style.cssText = spec.style || "";
      el.innerHTML = spec.innerHTML || "";
      attachObjectEvents(el);
      canvas.appendChild(el);
    });
    panel.style.display = "none";
    selected = null;
    currentTool = null;
    setActiveToolButton(null);
    updateDeleteButton();
  } finally {
    restoring = false;
  }
}

function undo(){
  if (historyIndex <= 0) return;
  historyIndex--;
  restoreState(history[historyIndex]);
}

function redo(){
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  restoreState(history[historyIndex]);
}

function applyMedical(){
  if (!selected) return;
  const count = Math.max(1, Math.min(5, parseInt($("pSymCount").value, 10) || 1));

  selected.classList.remove("affected", "affected2", "affected3", "affected4", "affected5", "counted", "oldsymptoms");
  delete selected.dataset.count;
  if ($("pAffected").checked){
    selected.dataset.count = String(count);
    selected.classList.add("counted", "oldsymptoms");
    if (count === 1){
      selected.classList.add("affected");
    } else if (count === 2){
      selected.classList.add("affected2");
    } else if (count === 3){
      selected.classList.add("affected3");
    } else if (count === 4){
      selected.classList.add("affected4");
    } else {
      selected.classList.add("affected5");
    }
  }

  selected.classList.toggle("death", $("pDeath").checked);
  selected.classList.toggle("stillmark", $("pStill").checked);
  selected.classList.toggle("proband", $("pProband").checked);
  selected.classList.toggle("consult", $("pConsult").checked);
  selected.classList.toggle("documented", $("pDocEval").checked);
  selected.classList.toggle("carrier", $("pCarrier").checked);
  selected.classList.toggle("asymp", $("pAsymp").checked);

  const oldComment = selected.querySelector(".comment");
  if (oldComment) oldComment.remove();
  const val = $("pComment").value.trim();
  if (val){
    const c = document.createElement("div");
    c.className = "comment";
    c.innerText = val;
    selected.appendChild(c);
  }

  hidePanel();
  commitHistory();
}

function clearSelection(){
  if (selected) selected.style.outline = "";
  selected = null;
  hidePanel();
  updateDeleteButton();
}

function deleteSelected(){
  if (!selected) return;
  const target = selected;
  clearSelection();
  if (target.parentNode) target.parentNode.removeChild(target);
  commitHistory();
  updateDeleteButton();
}

function updateDeleteButton(){
  deleteBtn.disabled = !selected;
}

function onObjectPointerDown(e){
  e.stopPropagation();
  closeMenus();

  const el = e.currentTarget;
  if (el.classList.contains("locked")) return;

  dragging = el;
  dragPointerId = e.pointerId;
  const pt = getCanvasPoint(e);
  const left = parseFloat(el.style.left) || 0;
  const top = parseFloat(el.style.top) || 0;
  dragOffsetX = pt.x - left;
  dragOffsetY = pt.y - top;
  dragDownX = pt.x;
  dragDownY = pt.y;
  dragMoved = false;

  try { el.setPointerCapture(e.pointerId); } catch(err){}
}

function onCanvasPointerDown(e){
  if (e.target.closest("#bottomDrawer") || e.target.closest("#appbar") || e.target.closest("#dataSheet") || e.target.closest("#panel") || e.target.closest("#aiPanel") || e.target.closest("#infoPanel")) return;
  closeMenus();

  const targetObj = e.target.closest(".obj");
  if (targetObj && canvas.contains(targetObj)) return;
  if (!currentTool || !drawingEnabled) return;

  const pt = getCanvasPoint(e);

  const el = createObject(currentTool, pt.x, pt.y);
  if (el){
    const snapped = snapPosition(el, parseFloat(el.style.left) || pt.x, parseFloat(el.style.top) || pt.y);
    el.style.left = snapped.x + "px";
    el.style.top = snapped.y + "px";
    commitHistory();
  }

  currentTool = null;
  setActiveToolButton(null);
}

function onCanvasPointerMove(e){
  if (!dragging) return;
  if (e.pointerId !== dragPointerId) return;

  const pt = getCanvasPoint(e);
  const moveDistance = Math.hypot(pt.x - dragDownX, pt.y - dragDownY);
  if (moveDistance > 6) dragMoved = true;

  let newX = pt.x - dragOffsetX;
  let newY = pt.y - dragOffsetY;

  const snapped = snapPosition(dragging, newX, newY);
  newX = snapped.x;
  newY = snapped.y;

  dragging.style.left = newX + "px";
  dragging.style.top = newY + "px";
}

function onCanvasPointerUp(){
  if (dragging){
    try { dragging.releasePointerCapture(dragPointerId); } catch(err){}
    if (!dragMoved){
      selectElement(dragging);
    } else {
      commitHistory();
    }
  }

  dragging = null;
  dragPointerId = null;
  dragMoved = false;
}

function escapeHtml(value){
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length){
    ctx.fillText("—", x, y);
    return y + lineHeight;
  }
  let line = "";
  let curY = y;
  for (const word of words){
    const testLine = line ? line + " " + word : word;
    if (ctx.measureText(testLine).width > maxWidth && line){
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, curY);
  return curY + lineHeight;
}

async function capturePedigreeShot(){
  clearSelection();
  // We added a tiny delay here so the blue outline disappears *before* it takes the picture
  await new Promise(resolve => setTimeout(resolve, 150)); 
  return await html2canvas(canvas, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true
  });
}


async function buildPedigreePdfBlob(){
  const shot = await capturePedigreeShot();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 4;
  const img = shot.toDataURL("image/png", 1.0);

  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const scale = Math.min(usableW / shot.width, usableH / shot.height);
  const drawW = shot.width * scale;
  const drawH = shot.height * scale;
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;

  pdf.addImage(img, "PNG", x, y, drawW, drawH);
  return pdf.output("blob");
}

async function buildPdfBlob(){
  return await buildPedigreePdfBlob();
}

function downloadBlob(blob, filename){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function viewPedigreePdf(){
  closeMenus();
  const blob = await buildPdfBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function downloadPedigreePdf(){
  closeMenus();
  const blob = await buildPdfBlob();
  downloadBlob(blob, "pedigree.pdf");
}

function savePedigree(){

  closeMenus();
  const data = {
    fields: Object.fromEntries(fieldIds.map(id => [id, $(id).value])),
    objects: Array.from(canvas.children).map(el => ({
      className: el.className,
      datasetType: el.dataset.type || "",
      style: el.style.cssText || "",
      innerHTML: el.innerHTML || ""
    }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pedigree.ped.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function loadPedigreeFromFile(file){
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(){
    try{
      const data = JSON.parse(reader.result);

      restoring = true;
      try{
        if (data.fields){
          fieldIds.forEach(id => { $(id).value = data.fields[id] ?? ""; });
        }

        canvas.innerHTML = "";
        (data.objects || []).forEach(spec => {
          const el = document.createElement("div");
          el.className = spec.className || "obj";
          if (spec.datasetType) el.dataset.type = spec.datasetType;
          el.style.cssText = spec.style || "";
          el.innerHTML = spec.innerHTML || "";
          attachObjectEvents(el);
          canvas.appendChild(el);
        });

        selected = null;
        hidePanel();
        currentTool = null;
        setActiveToolButton(null);
        updateDeleteButton();
      } finally {
        restoring = false;
      }

      commitHistory();
    } catch(err){
      alert("Load failed: invalid pedigree file.");
    }
  };
  reader.readAsText(file);
}

function refreshPage(){
  closeMenus();
  location.reload();
}

function showHelp(){
  closeMenus();
  alert(
    "Tap Data to open patient fields.\n" +
    "Tap Tools at the bottom to open the toolbar.\n" +
    "Select one tool and tap the canvas once to place one item.\n" +
    "Tap a symbol once to select its details, or drag it to move.\n" +
    "Use the trash icon to delete the selected item.\n" +
    "Use the analysis tool to review parent-to-child transmission and suggest an inheritance pattern.\n" +
    "Use the three-dot menu for View PDF, Download PDF, Refresh, and Help."
  );
}

function closeOnOutside(e){
  if (!e.target.closest("#moreWrap")) moreMenu.classList.remove("show");
  if (infoPanel.classList.contains("show") && !e.target.closest("#infoPanel") && !e.target.closest("#aboutBtn")) {
    hideInfoPanel();
  }
}

function inferSex(el){
  if (el.classList.contains("male") || el.classList.contains("maleD")) return "male";
  if (el.classList.contains("female") || el.classList.contains("femaleD") || el.classList.contains("surrogate")) return "female";
  return "unknown";
}

function isAffectedNode(el){
  return el.classList.contains("affected") ||
    el.classList.contains("affected2") ||
    el.classList.contains("affected3") ||
    el.classList.contains("affected4") ||
    el.classList.contains("affected5");
}

function getNodeBox(el){
  const x = parseFloat(el.style.left) || 0;
  const y = parseFloat(el.style.top) || 0;
  const w = el.offsetWidth || 44;
  const h = el.offsetHeight || 44;
  return {
    x, y, w, h,
    cx: x + w / 2,
    cy: y + h / 2
  };
}

function getPeopleNodes(){
  return Array.from(canvas.querySelectorAll(".obj"))
    .filter(el => el.classList.contains("shape") || el.classList.contains("tri"))
    .map((el, idx) => {
      const box = getNodeBox(el);
      return {
        el,
        id: idx,
        type: el.dataset.type || "",
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        cx: box.cx,
        cy: box.cy,
        sex: inferSex(el),
        affected: isAffectedNode(el),
        carrier: el.classList.contains("carrier"),
        asymp: el.classList.contains("asymp"),
        proband: el.classList.contains("proband"),
        consult: el.classList.contains("consult"),
        death: el.classList.contains("death"),
        stillmark: el.classList.contains("stillmark"),
        generation: 0
      };
    });
}

function getLineNodes(){
  return Array.from(canvas.querySelectorAll(".obj"))
    .filter(el => el.classList.contains("line"))
    .map((el, idx) => {
      const box = getNodeBox(el);
      return {
        el,
        id: idx,
        type: el.dataset.type || "",
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        cx: box.cx,
        cy: box.cy
      };
    });
}

function clusterGenerations(nodes){
  const sorted = [...nodes].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  const bands = [];
  const TH = 70;

  for (const n of sorted){
    let band = bands[bands.length - 1];
    if (!band || Math.abs(n.cy - band.centerY) > TH){
      band = { items: [], sumY: 0, centerY: n.cy, index: bands.length + 1 };
      bands.push(band);
    }
    band.items.push(n);
    band.sumY += n.cy;
    band.centerY = band.sumY / band.items.length;
  }

  sorted.forEach(n => {
    const band = bands.find(b => b.items.includes(n));
    n.generation = band ? band.index : 1;
  });

  return bands;
}

function dist(a, b){
  return Math.hypot(a.cx - b.cx, a.cy - b.cy);
}

function sameBand(items, gen){
  return items.filter(n => n.generation === gen);
}

function closestBandAbove(child, bands){
  const current = bands.find(b => b.items.includes(child));
  if (!current) return null;
  const prev = bands.find(b => b.index === Math.max(1, current.index - 1));
  return prev || null;
}

function lineNearPoint(line, point, tolX = 44, tolY = 44){
  return Math.abs(line.cx - point.x) <= tolX && Math.abs(line.cy - point.y) <= tolY;
}

function lineTouchesNode(line, node, tolX = 52, tolY = 56){
  return Math.abs(line.cx - node.cx) <= tolX && Math.abs(line.cy - node.cy) <= tolY;
}

function detectCouples(people, lines){
  const couples = [];
  const marriageLines = lines.filter(l => ["marriage", "consang", "separated"].includes(l.type));
  for (const line of marriageLines){
    const sameGen = people.filter(p => Math.abs(p.cy - line.cy) <= 85);
    if (sameGen.length < 2) continue;

    const left = [...sameGen].sort((a, b) => Math.abs(a.cx - line.x) - Math.abs(b.cx - line.x))[0];
    const right = [...sameGen]
      .filter(p => p !== left)
      .sort((a, b) => Math.abs(a.cx - (line.x + line.w)) - Math.abs(b.cx - (line.x + line.w)))[0];

    if (!left || !right) continue;
    const pair = [left, right].sort((a, b) => a.id - b.id);
    const key = pair.map(p => p.id).join("-");
    if (!couples.some(c => c.key === key)){
      couples.push({
        key,
        a: pair[0],
        b: pair[1],
        line
      });
    }
  }
  return couples;
}

function coupleFor(node, couples){
  return couples.find(c => c.a === node || c.b === node) || null;
}

function parentCandidateScore(parent, child, bands, couples, lines){
  if (parent === child) return -Infinity;
  if (parent.cy >= child.cy) return -Infinity;

  let score = 0;
  const dy = child.cy - parent.cy;
  const dx = Math.abs(child.cx - parent.cx);

  if (dy < 420) score += 2;
  if (dy < 250) score += 2;
  if (dy < 160) score += 2;

  if (dx < 180) score += 3;
  if (dx < 120) score += 3;
  if (dx < 80) score += 2;

  const childBand = bands.find(b => b.items.includes(child));
  const parentBand = bands.find(b => b.items.includes(parent));
  if (childBand && parentBand){
    if (childBand.index - parentBand.index === 1) score += 4;
    else if (childBand.index - parentBand.index === 2) score += 1;
  }

  const parentCouple = coupleFor(parent, couples);
  if (parentCouple){
    score += 2;
    const other = parentCouple.a === parent ? parentCouple.b : parentCouple.a;
    const midX = (parent.cx + other.cx) / 2;
    if (Math.abs(child.cx - midX) < 130) score += 3;
    if (Math.abs(child.cy - (Math.max(parent.cy, other.cy) + 140)) < 180) score += 1;
  }

  for (const line of lines){
    if (!["vertical", "nochild", "infertile", "bracket"].includes(line.type)) continue;
    if (Math.abs(line.cx - child.cx) < 110 && Math.abs(line.cy - parent.cy) < 180){
      score += 2;
    }
    if (Math.abs(line.cx - parent.cx) < 100 && Math.abs(line.cy - child.cy) < 220){
      score += 1;
    }
  }

  // Prefer parents in an upper generation and close to the child's horizontal position.
  if (childBand && parentBand && parentBand.index < childBand.index) score += 2;

  return score;
}

function inferParentChildEdges(people, bands, couples, lines){
  const edges = [];
  const edgeKeys = new Set();

  for (const child of people){
    const childBand = bands.find(b => b.items.includes(child));
    if (!childBand || childBand.index <= 1) continue;

    const candidateBands = bands.filter(b => b.index < childBand.index && childBand.index - b.index <= 2);
    const candidates = candidateBands.flatMap(b => b.items).filter(p => p !== child);
    const scored = candidates
      .map(parent => ({
        parent,
        score: parentCandidateScore(parent, child, bands, couples, lines)
      }))
      .filter(item => Number.isFinite(item.score) && item.score >= 5)
      .sort((a, b) => b.score - a.score);

    if (!scored.length) continue;

    const top = scored[0];
    const second = scored[1];

    const topCouple = coupleFor(top.parent, couples);
    const secondCouple = second ? coupleFor(second.parent, couples) : null;

    const choosePair =
      second &&
      top.score >= 8 &&
      second.score >= 8 &&
      top.parent.sex !== second.parent.sex &&
      Math.abs(top.parent.cy - second.parent.cy) < 55 &&
      Math.abs(top.parent.cx - second.parent.cx) > 20 &&
      Math.abs(child.cx - ((top.parent.cx + second.parent.cx) / 2)) < 150;

    if (choosePair){
      [top, second].forEach(item => {
        const key = `${item.parent.id}->${child.id}`;
        if (!edgeKeys.has(key)){
          edgeKeys.add(key);
          edges.push({
            parent: item.parent,
            child,
            score: item.score,
            evidence: "pair"
          });
        }
      });
      continue;
    }

    const key = `${top.parent.id}->${child.id}`;
    if (!edgeKeys.has(key)){
      edgeKeys.add(key);
      edges.push({
        parent: top.parent,
        child,
        score: top.score,
        evidence: topCouple ? "couple" : "single"
      });
    }
  }

  return edges;
}

function bandSummary(bands){
  return bands
    .map(b => ({
      index: b.index,
      members: b.items.length,
      affected: b.items.filter(n => n.affected).length
    }))
    .filter(row => row.members > 0);
}

function uniqueEdgesByChild(edges){
  const best = new Map();
  for (const edge of edges){
    const key = edge.child.id;
    const existing = best.get(key);
    if (!existing || edge.score > existing.score){
      best.set(key, edge);
    }
  }
  return Array.from(best.values());
}

function buildExpertAnalysis(){
  const people = getPeopleNodes();
  const lines = getLineNodes();
  const bands = clusterGenerations(people);
  const couples = detectCouples(people, lines);
  const edges = inferParentChildEdges(people, bands, couples, lines);
  const affected = people.filter(p => p.affected);
  const affectedM = affected.filter(p => p.sex === "male");
  const affectedF = affected.filter(p => p.sex === "female");
  const countsBySex = {
    male: people.filter(p => p.sex === "male").length,
    female: people.filter(p => p.sex === "female").length,
    unknown: people.filter(p => p.sex === "unknown").length
  };

  const unique = uniqueEdgesByChild(edges);
  const score = {
    "Autosomal dominant": 0,
    "Autosomal recessive": 0,
    "X-linked recessive": 0,
    "X-linked dominant": 0,
    "Y-linked": 0,
    "Mitochondrial": 0
  };

  const reasons = {
    "Autosomal dominant": [],
    "Autosomal recessive": [],
    "X-linked recessive": [],
    "X-linked dominant": [],
    "Y-linked": [],
    "Mitochondrial": []
  };

  const add = (name, pts, text) => {
    score[name] += pts;
    if (text) reasons[name].push(text);
  };

  const addNeg = (name, pts, text) => {
    score[name] -= pts;
    if (text) reasons[name].push("Contra: " + text);
  };

  if (!people.length){
    return { people, lines, bands, couples, edges: unique, affected, score, reasons, top: null, confidence: 0 };
  }

  if (!affected.length){
    Object.keys(score).forEach(name => reasons[name].push("Mark affected family members to compare transmission paths."));
    return { people, lines, bands, couples, edges: unique, affected, score, reasons, top: null, confidence: 0 };
  }

  const affectedBandSet = new Set(affected.map(p => p.generation));
  const minBand = Math.min(...affected.map(p => p.generation));
  const maxBand = Math.max(...affected.map(p => p.generation));
  const consecutiveBands = [];
  for (let i = minBand; i <= maxBand; i++) consecutiveBands.push(i);
  const allConsecutiveAffected = consecutiveBands.every(g => affectedBandSet.has(g)) && consecutiveBands.length >= 2;
  const sexBalance = affected.length ? Math.min(affectedM.length, affectedF.length) / affected.length : 0;
  const maleBias = affected.length ? affectedM.length / affected.length : 0;
  const femaleBias = affected.length ? affectedF.length / affected.length : 0;

  const fatherToSon = unique.filter(e => e.parent.sex === "male" && e.child.sex === "male");
  const fatherToDaughter = unique.filter(e => e.parent.sex === "male" && e.child.sex === "female");
  const motherToSon = unique.filter(e => e.parent.sex === "female" && e.child.sex === "male");
  const motherToDaughter = unique.filter(e => e.parent.sex === "female" && e.child.sex === "female");

  const affectedFatherToSon = fatherToSon.filter(e => e.parent.affected && e.child.affected);
  const affectedFatherToDaughter = fatherToDaughter.filter(e => e.parent.affected && e.child.affected);
  const affectedMotherToAny = unique.filter(e => e.parent.sex === "female" && e.parent.affected && e.child.affected);
  const affectedFatherToAny = unique.filter(e => e.parent.sex === "male" && e.parent.affected && e.child.affected);

  const childrenByParent = new Map();
  for (const edge of unique){
    const arr = childrenByParent.get(edge.parent) || [];
    arr.push(edge.child);
    childrenByParent.set(edge.parent, arr);
  }

  const mothers = people.filter(p => p.sex === "female");
  const fathers = people.filter(p => p.sex === "male");

  const affectedMotherAllChildrenAffected = mothers.filter(m => m.affected).filter(m => {
    const kids = childrenByParent.get(m) || [];
    return kids.length >= 2 && kids.every(k => k.affected);
  });

  const affectedFatherAllSonsAffected = fathers.filter(f => f.affected).filter(f => {
    const kids = childrenByParent.get(f) || [];
    const sons = kids.filter(k => k.sex === "male");
    return sons.length >= 1 && sons.every(k => k.affected);
  });

  const affectedFatherDaughtersAffectedOnly = fathers.filter(f => f.affected).filter(f => {
    const kids = childrenByParent.get(f) || [];
    const daughters = kids.filter(k => k.sex === "female");
    const sons = kids.filter(k => k.sex === "male");
    return daughters.length >= 1 && daughters.every(k => k.affected) && sons.every(k => !k.affected);
  });

  const unaffectedParentsAffectedChild = unique.filter(e => !e.parent.affected && e.child.affected);
  const affectedChildUnaffectedMother = unique.filter(e => e.parent.sex === "female" && !e.parent.affected && e.child.affected);
  const affectedChildUnaffectedFather = unique.filter(e => e.parent.sex === "male" && !e.parent.affected && e.child.affected);

  // Y-linked
  if (affectedM.length > 0 && affectedF.length === 0){
    add("Y-linked", 12, "Only males are affected.");
  }
  if (affectedFatherToSon.length){
    add("Y-linked", 6, "Affected fathers pass the trait to affected sons.");
  }
  if (!fatherToDaughter.length && fatherToSon.length){
    add("Y-linked", 4, "No father-to-daughter transmission is seen.");
  }
  if (affectedF.length){
    addNeg("Y-linked", 12, "Females are affected, which rules out Y-linkage.");
  }

  // Mitochondrial
  if (affectedMotherAllChildrenAffected.length){
    add("Mitochondrial", 10, "An affected mother appears to pass the trait to all of her children.");
  }
  if (affectedMotherToAny.length && !affectedFatherToAny.length){
    add("Mitochondrial", 6, "Transmission is seen through mothers, not fathers.");
  }
  if (!motherToSon.length && !motherToDaughter.length && affectedF.length){
    add("Mitochondrial", 2, "Female affected pattern can fit mitochondrial inheritance.");
  }
  if (affectedFatherToAny.length){
    addNeg("Mitochondrial", 10, "Affected fathers transmit the trait, which argues against pure mitochondrial inheritance.");
  }

  // X-linked dominant
  if (affectedFatherDaughtersAffectedOnly.length){
    add("X-linked dominant", 10, "Affected fathers pass the trait to daughters but not sons.");
  }
  if (!affectedFatherToSon.length && fatherToDaughter.length){
    add("X-linked dominant", 5, "No father-to-son transmission is seen.");
  }
  if (femaleBias >= 0.55){
    add("X-linked dominant", 2, "Affected females are more common.");
  }
  if (affectedFatherToSon.length){
    addNeg("X-linked dominant", 8, "Father-to-son transmission argues against X-linked dominant inheritance.");
  }

  // X-linked recessive
  if (maleBias >= 0.65){
    add("X-linked recessive", 8, "Affected individuals are mostly male.");
  }
  if (!affectedFatherToSon.length && fatherToSon.length){
    add("X-linked recessive", 6, "No affected father-to-son transmission is seen.");
  }
  if (unaffectedParentsAffectedChild.length){
    add("X-linked recessive", 3, "An affected child can arise from unaffected parents in X-linked recessive families.");
  }
  if (affectedChildUnaffectedMother.length){
    add("X-linked recessive", 2, "Affected sons of unaffected mothers can fit carrier transmission.");
  }
  if (affectedF.length >= affectedM.length && affected.length >= 3){
    addNeg("X-linked recessive", 6, "Too many affected females for a typical X-linked recessive pattern.");
  }

  // Autosomal dominant
  if (allConsecutiveAffected){
    add("Autosomal dominant", 8, "Affected individuals appear in consecutive generations.");
  }
  if (affectedFatherToSon.length){
    add("Autosomal dominant", 6, "Father-to-son transmission is present.");
  }
  if (affected.length >= 2 && sexBalance >= 0.35){
    add("Autosomal dominant", 3, "Affected males and females are both represented.");
  }
  if (affectedMotherToAny.length || affectedFatherToAny.length){
    add("Autosomal dominant", 2, "Affected parent-to-child transmission is present.");
  }

  // Autosomal recessive
  if (unaffectedParentsAffectedChild.length){
    add("Autosomal recessive", 10, "An affected child appears to be born to unaffected parents.");
  }
  if (!allConsecutiveAffected){
    add("Autosomal recessive", 3, "Skipping generations supports recessive inheritance.");
  }
  if (affected.length >= 2 && sexBalance >= 0.35){
    add("Autosomal recessive", 3, "Both sexes are affected in roughly similar numbers.");
  }
  if (couples.length && unique.some(e => e.parent.affected && !e.child.affected)){
    add("Autosomal recessive", 1, "A mix of affected and unaffected siblings can fit carrier parents.");
  }

  const consang = !!canvas.querySelector(".consang");
  if (consang){
    add("Autosomal recessive", 6, "Consanguinity marker is present.");
  }

  // Broad contradictions to sharpen the result
  if (fatherToSon.length){
    addNeg("X-linked dominant", 5, "Father-to-son transmission is present.");
    addNeg("X-linked recessive", 4, "Father-to-son transmission is present.");
  }
  if (affectedF.length && affectedM.length === 0){
    addNeg("Y-linked", 20, "Y-linked traits do not affect females.");
  }

  // Use generation structure as supporting evidence only after relationship analysis.
  if (allConsecutiveAffected){
    add("Autosomal dominant", 2, "The affected nodes occupy multiple consecutive generation bands.");
  }

  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const top = sorted[0] || null;
  const runnerUp = sorted[1] ? sorted[1][1] : 0;
  const topScore = top ? top[1] : 0;
  const sumPositive = Object.values(score).reduce((sum, val) => sum + Math.max(0, val), 0) || 1;
  const confidence = top
    ? Math.max(20, Math.min(96, Math.round((topScore / sumPositive) * 100 + Math.max(0, topScore - runnerUp) * 2)))
    : 0;

  const childMap = new Map();
  for (const edge of unique){
    const list = childMap.get(edge.parent) || [];
    list.push(edge.child);
    childMap.set(edge.parent, list);
  }

  const transmissionEvidence = [];
  const evidenceEdges = unique
    .filter(e => e.parent.affected || e.child.affected)
    .sort((a, b) => b.score - a.score);

  for (const edge of evidenceEdges){
    const pSex = edge.parent.sex === "male" ? "father" : edge.parent.sex === "female" ? "mother" : "parent";
    const cSex = edge.child.sex === "male" ? "son" : edge.child.sex === "female" ? "daughter" : "child";
    transmissionEvidence.push(
      `${pSex} (${edge.parent.affected ? "affected" : "unaffected"}) → ${cSex} (${edge.child.affected ? "affected" : "unaffected"})`
    );
    if (transmissionEvidence.length >= 8) break;
  }

  const contradictions = [];
  if (affectedF.length && score["Y-linked"] <= 0) contradictions.push("Female affected nodes are present, so Y-linked is not plausible.");
  if (fatherToSon.length) contradictions.push("Father-to-son transmission removes pure X-linkage.");
  if (affectedFatherToAny.length && affectedMotherToAny.length) contradictions.push("Both paternal and maternal transmission may be present, which often favors autosomal inheritance.");
  if (affectedMotherAllChildrenAffected.length && !affectedFatherToAny.length) contradictions.push("A strong maternal line raises mitochondrial inheritance.");
  if (unaffectedParentsAffectedChild.length) contradictions.push("At least one affected child appears to arise from unaffected parents, which supports recessive inheritance.");

  return {
    people,
    lines,
    bands,
    couples,
    edges: unique,
    affected,
    countsBySex,
    score,
    reasons,
    top,
    confidence,
    transmissionEvidence,
    contradictions,
    bandSummary: bandSummary(bands)
  };
}

function showAiPanel(result){
  aiPanel.style.display = "block";

  if (!result.top || !result.affected.length){
    aiBody.innerHTML = `
      <div id="aiTop">Need more pedigree data</div>
      <div>Mark affected and unaffected family members, then run Senior analysis again.</div>
    `;
    return;
  }

  const sorted = Object.entries(result.score).sort((a, b) => b[1] - a[1]);
  const topLabel = result.top[0];
  const reasons = (result.reasons[topLabel] || []).slice(0, 5);
  const topScore = result.top[1];
  const runnerUp = sorted[1] ? sorted[1][1] : 0;
  const confidence = result.confidence || Math.max(20, Math.min(96, Math.round((topScore / Math.max(1, topScore + runnerUp)) * 100)));

  aiBody.innerHTML = `
    <div id="aiTop">Likely: ${escapeHtml(topLabel)}</div>
    <div>Expert confidence: ${confidence}%</div>
    <div id="aiConfidence"><span style="width:${confidence}%"></span></div>
    <div style="font-size:11px; margin-bottom:6px;">Relationship-based analysis from the pedigree layout.</div>

    <div style="font-weight:700; margin:8px 0 4px;">Why this pattern fits:</div>
    <div id="aiList">
      ${reasons.length ? reasons.map(r => `<div>• ${escapeHtml(r)}</div>`).join("") : `<div>• Pattern scored from parent-to-child links.</div>`}
    </div>

    <div style="font-weight:700; margin:10px 0 4px;">Detected transmission evidence:</div>
    <div id="aiList">
      ${result.transmissionEvidence.length
        ? result.transmissionEvidence.map(r => `<div>• ${escapeHtml(r)}</div>`).join("")
        : `<div>• No strong transmission path detected yet.</div>`}
    </div>

    ${result.contradictions.length ? `
      <div style="font-weight:700; margin:10px 0 4px;">Warnings:</div>
      <div id="aiList">
        ${result.contradictions.map(r => `<div>• ${escapeHtml(r)}</div>`).join("")}
      </div>
    ` : ""}

    <div style="font-weight:700; margin:10px 0 4px;">Other possible patterns:</div>
    <div style="margin-top:4px;">
      ${sorted.slice(1, 4).map(([name, score]) => `<div>${escapeHtml(name)} — ${score}</div>`).join("")}
    </div>

    <div style="font-weight:700; margin:10px 0 4px;">Generation bands:</div>
    <div style="margin-top:4px;">
      ${result.bandSummary.map(row => `<div>Gen ${row.index}: ${row.members} members, ${row.affected} affected</div>`).join("")}
    </div>
  `;
}

function runAiDetection(){
  const result = buildExpertAnalysis();
  showAiPanel(result);
}


function generateHelpPdf(kind, downloadOnly = false){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 42;
  const marginTop = 44;
  const lineGap = 16;
  const maxW = pageW - marginX * 2;

  function addTitle(title, subtitle = ""){
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(title, marginX, 44);
    if (subtitle){
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(subtitle, marginX, 60);
    }
  }

  function addHeading(heading, y){
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(heading, marginX, y);
    return y + 16;
  }

  function addParagraph(text, y, fontSize = 10.5){
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW);
    lines.forEach(line => {
      if (y > pageH - 46){
        doc.addPage();
        y = marginTop;
      }
      doc.text(line, marginX, y);
      y += lineGap;
    });
    return y + 4;
  }

  function addBullet(text, y, fontSize = 10.5){
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW - 16);
    lines.forEach((line, idx) => {
      if (y > pageH - 46){
        doc.addPage();
        y = marginTop;
      }
      doc.text(idx === 0 ? `• ${line}` : `  ${line}`, marginX, y);
      y += lineGap;
    });
    return y + 2;
  }

  let y = marginTop;

  if (kind === "pedigree") {
    addTitle(
      "What is Pedigree",
      "Educational reference for the symbols, shapes, lines, and labels used in pedigree charts."
    );

    y = 78;

    y = addHeading("1. SIGNS (Individuals / Symbols)", y);
    y = addHeading("Basic Individuals", y);
    y = addBullet("Male (□) -> square -> represents male", y);
    y = addBullet("Female (○) -> circle -> represents female", y);
    y = addBullet("Unknown (◇) -> diamond -> gender unknown", y);

    y = addHeading("Modified Individuals", y);
    y = addBullet("Male N / Female N / Unknown N: N inside means multiple individual but number unknown or unstated", y);
    y = addBullet("Male D / Female D: D (red) means donor (specific marking)", y);
    y = addBullet("Surrogate (○ with S, green): surrogate mother", y);
    y = addBullet("Unknown P (◇ with P): pregnancy or unspecified parental role", y);

    y = addHeading("Pregnancy-related Signs", y);
    y = addBullet("Pregnancy (triangle): current pregnancy", y);
    y = addBullet("SAB (triangle): spontaneous abortion", y);
    y = addBullet("TOP (filled triangle): termination of pregnancy", y);
    y = addBullet("Ectopic (triangle): ectopic pregnancy", y);

    y = addHeading("Special Labels", y);
    y = addBullet("? (Question mark): unknown information", y);
    y = addBullet("Roman I-X: generation numbering", y);
    y = addBullet("Free Text: custom label such as name or note", y);

    y = addHeading("2. SHAPE STATES (Medical / Clinical Meaning)", y);
    y = addParagraph("These are applied on top of symbols.", y);
    y = addHeading("Disease / Symptoms", y);
    y = addBullet("Affected (full black): 1 condition", y);
    y = addBullet("Affected2 (half black): 2 conditions", y);
    y = addBullet("Affected3 (3 shades): 3 conditions", y);
    y = addBullet("Affected4 / 5 (segmented shading): multiple conditions", y);
    y = addParagraph("Function: shows affected condition.", y);

    y = addHeading("Clinical Markings", y);
    y = addBullet("Death (diagonal red line): deceased", y);
    y = addBullet("Stillbirth (SB): stillborn", y);
    y = addBullet("Carrier (dot inside): carrier of trait", y);
    y = addBullet("Asymptomatic (vertical line inside): no symptoms but may carry gene", y);
    y = addBullet("Documented (*): clinically confirmed", y);
    y = addBullet("Proband (arrow + P): index case (main patient)", y);
    y = addBullet("Consultand (arrow): person seeking consultation", y);

    y = addHeading("Extra", y);
    y = addBullet("Comment text below: additional notes", y);
    y = addBullet("Count number (center): numeric marking (if used)", y);

    y = addHeading("3. LINES (Relationships)", y);
    y = addHeading("Core Family Lines", y);
    y = addBullet("Marriage Line (—): connects partners", y);
    y = addBullet("Consanguineous Line (= double line): blood relation marriage", y);
    y = addBullet("Sibling Line (— horizontal): connects siblings", y);
    y = addBullet("Vertical Line (|): parent -> child connection", y);

    y = addHeading("Relationship Status", y);
    y = addBullet("Separated (two slashes //): separated/divorced couple", y);

    y = addHeading("Reproductive Status", y);
    y = addBullet("No Child (┴): no children", y);
    y = addBullet("Infertility (┴ with double line): infertile couple", y);

    y = addHeading("Structural Tools", y);
    y = addBullet("Bracket ([ ]): use for adoptions", y);

    y = addHeading("Diagonal Lines", y);
    y = addBullet("45° / 135° line: marking or annotation", y);
    y = addBullet("Dashed diagonal: adoptive parents", y);

    y = addHeading("Important Note", y);
    y = addParagraph("This app is for educational use only. It is not intended to diagnose, detect, prevent, or treat any disease or medical condition.", y);
  } else {
    addTitle(
      "Pattern of Genetic Inheritance",
      "Educational summary of inheritance patterns commonly shown in pedigree charts."
    );

    y = 78;
    y = addParagraph("Inheritance patterns describe how a trait or disease is transmitted from one generation to the next.", y);
    y = addParagraph("Autosomal dominant inheritance often appears in every generation and may affect males and females equally.", y);
    y = addParagraph("Autosomal recessive inheritance can skip generations and may appear more often when both parents are carriers.", y);
    y = addParagraph("X-linked patterns, mitochondrial inheritance, and other forms may also be recognized by reviewing the pedigree structure and symbol pattern.", y);
  }

  if (downloadOnly) {
    doc.save(kind === "pedigree" ? "what-is-pedigree.pdf" : "pattern-of-genetic-inheritance.pdf");
  } else {
    window.open(doc.output("bloburl"), "_blank");
  }
}

function showAboutFromMenu(){
  showInfoPanel();
  bottomDrawer.classList.remove("open");
}

function goToDrawing(){
  hideInfoPanel();
  toggleTools(true);
  canvas.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}


function hideAiPanel(){
  aiPanel.style.display = "none";
}

function init(){
  buildToolButtons();
  buildLineButtons();
  buildSpecialButtons();

  $("dataBtn").onclick = toggleData;
  $("aiBtn").onclick = runAiDetection;
  $("pedigreeBtn").onclick = goToDrawing;
  $("whatBtn").onclick = () => generateHelpPdf('pedigree', false);
  $("whatDownloadBtn").onclick = () => generateHelpPdf('pedigree', true);
  $("patternBtn").onclick = () => generateHelpPdf('pattern', false);
  $("patternDownloadBtn").onclick = () => generateHelpPdf('pattern', true);
  $("aboutBtn").onclick = showAboutFromMenu;
  $("closeDataBtn").onclick = () => dataSheet.classList.remove("show");
  $("toggleToolsBtn").onclick = () => toggleTools();
  $("infoCloseBtn").onclick = hideInfoPanel;

  $("panelCloseBtn").onclick = hidePanel;
  $("hidePanelBtn").onclick = hidePanel;
  $("applyBtn").onclick = applyMedical;

  $("saveBtn").onclick = savePedigree;
  $("loadBtn").onclick = () => $("loadFile").click();
  $("loadFile").onchange = (e) => loadPedigreeFromFile(e.target.files[0]);

  $("undoBtn").onclick = undo;
  $("redoBtn").onclick = redo;
  deleteBtn.onclick = deleteSelected;

  $("viewPdfBtn").onclick = viewPedigreePdf;
  $("downloadPdfBtn").onclick = downloadPedigreePdf;
  $("refreshBtn").onclick = refreshPage;
  $("helpBtn").onclick = showHelp;

  $("moreBtn").onclick = (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle("show");
  };

  $("aiCloseBtn").onclick = hideAiPanel;
  $("aiRunBtn").onclick = runAiDetection;

  document.addEventListener("click", closeOnOutside);
  acceptDraw.addEventListener("change", updateDrawingGate);
  updateDrawingGate();
  document.addEventListener("touchstart", closeOnOutside, { passive: true });

  canvas.addEventListener("pointerdown", onCanvasPointerDown);
  canvas.addEventListener("pointermove", onCanvasPointerMove);
  canvas.addEventListener("pointerup", onCanvasPointerUp);
  canvas.addEventListener("pointercancel", onCanvasPointerUp);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      moreMenu.classList.remove("show");
      dataSheet.classList.remove("show");
      hidePanel();
      hideAiPanel();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y"){
      e.preventDefault();
      redo();
    }
  });

  commitHistory();
  updateDeleteButton();
}

init();