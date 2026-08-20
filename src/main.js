import { LEVELS, canCompleteLevel, levelById } from "./domain/curriculum.js";
import { createQuestion, createTableQuestion, difficultFacts, recordFact } from "./domain/question.js";
import { encouragement, hintsFor } from "./domain/hints.js";
import { finalePoints } from "./domain/finaleScoring.js";
import { masteryGrid, masterySummary } from "./domain/mastery.js";
import { COSMETIC_REWARDS, createDailyPractice, unlockedRewards } from "./domain/dailyPractice.js";
import { createProgressBackup, parseProgressBackup } from "./data/progressBackup.js";
import { initialProgress, loadProgress, resetProgress, saveProgress } from "./data/progressStore.js";

const app = document.querySelector("#app");
const ACCESS = Object.freeze({ username: "eelin", password: "Väinö1" });
const LOGIN_SESSION_KEY = "kertotaikuri-login-session";
const REWARD_ICONS = { classic: "🧙‍♀️", sparkles: "✨", forest: "🌿", "golden-wand": "🪄", rainbow: "🌈" };
let progress = loadProgress();
let loggedIn = sessionStorage.getItem(LOGIN_SESSION_KEY) === "active";
let session;
let question;
let answer = "";
let attempts = 0;
let usedHint = false;
let hintIndex = 0;
let streak = 0;
let feedback = null;
let resetArmed = false;
let questionStartedAt = 0;
let learnStep = 1;
let backupMessage = "";

const isFinale = () => progress.mode === "path" && progress.selectedLevel === LEVELS.length;
const todayKey = () => new Intl.DateTimeFormat("sv-SE").format(new Date());
const selectedReward = () => unlockedRewards(progress.stars, progress.completedTables)
  .find(({ id }) => id === progress.selectedRewardId) ?? COSMETIC_REWARDS[0];

function renderLogin(hasError = false) {
  app.innerHTML = `
    <section class="login-screen">
      <div class="login-mascot">✦</div><p class="login-eyebrow">Tervetuloa Kertotaikuriin</p>
      <h1>Kirjaudu pelaamaan</h1>
      <form id="loginForm" class="login-form">
        <label>Käyttäjänimi<input id="username" autocomplete="username" autocapitalize="none" required></label>
        <label>Salasana<input id="password" type="password" autocomplete="current-password" required></label>
        ${hasError ? `<p class="login-error" role="alert">Käyttäjänimi tai salasana ei ollut oikein.</p>` : ""}
        <button class="primary" type="submit">Aloita peli →</button>
      </form>
    </section>`;
  app.querySelector("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (app.querySelector("#username").value.trim() === ACCESS.username && app.querySelector("#password").value === ACCESS.password) {
      sessionStorage.setItem(LOGIN_SESSION_KEY, "active");
      loggedIn = true;
      startGame();
    } else renderLogin(true);
  });
}

function startGame() { newSession(); render(); }

function currentLesson() {
  if (progress.mode === "daily") return { id: "daily", name: "Päivän 10", goal: 10, description: "Sopiva sekoitus kertausta, vaikeita laskuja ja korkeintaan yksi uusi lasku." };
  if (progress.mode === "tables" || progress.mode === "learn") return {
    id: `table-${progress.selectedTable}`, name: `${progress.selectedTable}:n kertotaulu`, tables: [progress.selectedTable], goal: 15,
    description: `Kaikki ${progress.selectedTable}:n kertolaskut 0–10 ja vaikeat laskut uudelleen.`
  };
  return levelById(progress.selectedLevel);
}

function createLessonQuestion(lesson, previousKey = "") {
  if (progress.mode === "daily") return session.dailyQuestions[session.total] ?? session.dailyQuestions.at(-1);
  if (progress.mode === "tables" || progress.mode === "learn") {
    const next = createTableQuestion(progress.selectedTable, session.askedKeys, progress.factStats, Math.random, previousKey);
    if (!session.askedKeys.includes(next.key)) session.askedKeys.push(next.key);
    return next;
  }
  return createQuestion(lesson, progress.factStats, Math.random, previousKey);
}

function newSession() {
  const lesson = currentLesson();
  session = { total: 0, correct: 0, goal: lesson.goal, askedKeys: [], dailyQuestions: progress.mode === "daily" ? createDailyPractice(progress.factStats) : [] };
  question = createLessonQuestion(lesson);
  questionStartedAt = performance.now();
  answer = ""; attempts = 0; usedHint = false; hintIndex = 0; feedback = null;
}

function setMode(mode) { progress.mode = mode; saveProgress(progress); newSession(); render(); }
function setTable(table) { progress.selectedTable = table; learnStep = 1; saveProgress(progress); newSession(); render(); }
function setLevel(id) { if (id > progress.unlockedLevel) return; progress.selectedLevel = id; saveProgress(progress); newSession(); render(); }

function nextQuestion() {
  question = createLessonQuestion(currentLesson(), question.key);
  questionStartedAt = performance.now();
  answer = ""; attempts = 0; usedHint = false; hintIndex = 0; feedback = null; render();
}

function submitAnswer() {
  if (!answer || ["success", "reveal"].includes(feedback?.kind)) return;
  const isCorrect = Number(answer) === question.answer;
  const elapsedMs = performance.now() - questionStartedAt;
  attempts += 1;
  if (isFinale()) return submitFinaleAnswer(isCorrect, elapsedMs);
  if (isCorrect) {
    const masteredWithoutHelp = attempts === 1 && !usedHint;
    session.total += 1;
    session.correct += masteredWithoutHelp ? 1 : 0;
    streak += 1;
    const earned = masteredWithoutHelp ? 2 : 1;
    progress.stars += earned;
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    progress.factStats = recordFact(progress.factStats, question, masteredWithoutHelp, elapsedMs);
    feedback = { kind: "success", text: `${encouragement(streak)} +${earned} ⭐` };
    if (progress.mode === "daily" && session.total >= session.goal) completeDaily();
    else if (canCompleteLevel(session)) completeLesson();
    saveProgress(progress);
  } else if (attempts === 1) {
    streak = 0; showHint(); answer = "";
  } else {
    session.total += 1; streak = 0;
    progress.factStats = recordFact(progress.factStats, question, false, elapsedMs);
    feedback = { kind: "reveal", text: `Vastaus on ${question.answer}. Ei haittaa – harjoitus tekee tästä tutun!` };
    if (progress.mode === "daily" && session.total >= session.goal) completeDaily();
    saveProgress(progress);
  }
  render();
}

function submitFinaleAnswer(isCorrect, elapsedMs) {
  const points = finalePoints(elapsedMs, isCorrect);
  session.total += 1;
  if (isCorrect) {
    session.correct += 1; streak += 1;
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    progress.factStats = recordFact(progress.factStats, question, true, elapsedMs);
    feedback = { kind: "success", text: `Oikein ${(elapsedMs / 1000).toFixed(1)} sekunnissa! +${points} ⭐` };
  } else {
    streak = 0; progress.factStats = recordFact(progress.factStats, question, false, elapsedMs);
    feedback = { kind: "reveal", text: `Vastaus on ${question.answer}. −2 ⭐ – seuraava voi jo onnistua!` };
  }
  progress.stars = Math.max(0, progress.stars + points);
  if (session.total >= session.goal) completeFinale();
  saveProgress(progress); render();
}

function completeDaily() {
  const day = todayKey();
  const firstToday = !progress.dailyHistory?.[day];
  progress.dailyHistory = { ...(progress.dailyHistory ?? {}), [day]: Math.max(progress.dailyHistory?.[day] ?? 0, session.correct) };
  progress.practiceDays = Object.keys(progress.dailyHistory).length;
  if (firstToday) progress.stars += 10;
  feedback = { kind: "dailyComplete", text: `Päivän tehtävät tehty: ${session.correct}/10 ilman apua! ${firstToday ? "+10 ⭐" : "Hieno kertaus!"}` };
}

function completeFinale() {
  if (!progress.completedLevels.includes(LEVELS.length)) progress.completedLevels.push(LEVELS.length);
  const accuracy = Math.round((session.correct / session.total) * 100);
  feedback = { kind: "finaleComplete", text: `Grande finale valmis! Sait ${session.correct}/${session.total} oikein (${accuracy} %). 🏆` };
}

function showHint(next = false) {
  const hints = hintsFor(question.a, question.b); usedHint = true;
  if (next) hintIndex = (hintIndex + 1) % hints.length;
  feedback = { kind: "hint", text: hints.length > 1 ? `<strong>Tapa ${hintIndex + 1}/${hints.length}:</strong> ${hints[hintIndex]}` : hints[0], hasAlternatives: hints.length > 1 };
}

function completeLesson() {
  if (progress.mode === "tables") {
    const table = progress.selectedTable;
    if (!progress.completedTables.includes(table)) { progress.completedTables.push(table); progress.stars += 10; }
    feedback = { kind: "tableComplete", text: `Hienoa! Harjoittelit koko ${table}:n kertotaulun. +10 ⭐` }; return;
  }
  const id = progress.selectedLevel;
  if (!progress.completedLevels.includes(id)) { progress.completedLevels.push(id); progress.stars += 10; }
  progress.unlockedLevel = Math.min(LEVELS.length, Math.max(progress.unlockedLevel, id + 1));
  feedback = { kind: "levelup", text: id === LEVELS.length ? "Olet Kertotaikuri! Kaikki taulut ovat hallussa. 🏆" : "Taso läpäisty – uusi maailma aukesi! +10 ⭐" };
}

function handleKey(value) { if (value === "back") answer = answer.slice(0, -1); else if (answer.length < 3) answer += value; render(); }

function levelMap() {
  return LEVELS.map((level) => {
    const locked = level.id > progress.unlockedLevel; const completed = progress.completedLevels.includes(level.id); const current = level.id === progress.selectedLevel;
    return `<button class="level ${current ? "current" : ""}" data-level="${level.id}" ${locked ? "disabled" : ""}><span>${locked ? "🔒" : completed ? "⭐" : level.id}</span><small>${level.name}</small></button>`;
  }).join("");
}

function tableMap() {
  return Array.from({ length: 11 }, (_, table) => `<button class="table-choice ${table === progress.selectedTable ? "current" : ""}" data-table="${table}">${progress.completedTables.includes(table) ? "⭐" : table}</button>`).join("");
}

function learnView() {
  const a = progress.selectedTable; const b = learnStep; const total = a * b;
  const groups = a === 0 ? `<div class="empty-groups">Ei yhtään ryhmää → ei yhtään esinettä</div>` : Array.from({ length: a }, (_, group) => `<span class="dot-group" aria-label="ryhmä ${group + 1}">${Array.from({ length: b }, () => "<i></i>").join("") || "<em>tyhjä</em>"}</span>`).join("");
  const addition = a === 0 ? "Kun ryhmiä ei ole yhtään, esineitäkin on 0." : b === 0 ? `Jokaisessa ${a} ryhmässä on 0 esinettä, joten yhteensä on 0.` : `${Array.from({ length: a }, () => b).join(" + ")} = ${total}`;
  return `<section class="learn-card">
    <p class="eyebrow">Katso, kokeile ja oivalla</p><h1>${a} × ${b} = ${total}</h1>
    <p>${a} ryhmää, jokaisessa ${b} esinettä.</p><div class="groups-visual">${groups}</div>
    <div class="teacher-note"><strong>Näin voit ajatella:</strong> ${addition}</div>
    <div class="learn-controls"><button id="learnPrev" ${b === 0 ? "disabled" : ""}>← Edellinen</button><span>${b} / 10</span><button id="learnNext">${b === 10 ? "Alusta" : "Seuraava"} →</button></div>
    <button class="primary" id="practiceThis">Harjoittele ${a}:n kertotaulua</button>
  </section>${masteryMapView()}`;
}

function masteryMapView() {
  const grid = masteryGrid(progress.factStats);
  return `<section class="mastery-card"><h2>Minun taitokarttani</h2><p>Jokainen ruutu on yksi kertolasku. Ruudut kirkastuvat harjoittelemalla.</p>
    <div class="mastery-scroll"><div class="mastery-grid"><span></span>${Array.from({ length: 11 }, (_, b) => `<b>${b}</b>`).join("")}${grid.map((row, a) => `<b>${a}</b>${row.map((level, b) => `<button class="mastery-cell ${level}" data-mastery-table="${a}" aria-label="${a} kertaa ${b}: ${level}"></button>`).join("")}`).join("")}</div></div>
    <div class="mastery-legend"><span><i class="unseen"></i>Uusi</span><span><i class="learning"></i>Harjoitellaan</span><span><i class="known"></i>Osataan</span><span><i class="fluent"></i>Sujuva</span></div></section>`;
}

function rewardsView() {
  const available = unlockedRewards(progress.stars, progress.completedTables);
  return `<section class="rewards"><h3>Palkintohylly</h3><div>${COSMETIC_REWARDS.map((reward) => {
    const open = available.some(({ id }) => id === reward.id); const selected = selectedReward().id === reward.id;
    return `<button data-reward="${reward.id}" ${open ? "" : "disabled"} class="${selected ? "selected" : ""}"><span>${open ? REWARD_ICONS[reward.id] : "🔒"}</span><small>${reward.name}</small></button>`;
  }).join("")}</div></section>`;
}

function parentView() {
  const hardest = difficultFacts(progress.factStats); const summary = masterySummary(progress.factStats).total;
  return `<details class="grownups" ${resetArmed || backupMessage ? "open" : ""}><summary>Aikuiselle · edistyminen ja varmuuskopio</summary>
    <div class="parent-dashboard"><div class="stat-cards"><span><strong>${summary.known + summary.fluent}</strong> osataan</span><span><strong>${summary.fluent}</strong> sujuvaa</span><span><strong>${progress.practiceDays ?? 0}</strong> harjoituspäivää</span></div>
    <p>Vaikeat laskut: <strong>${hardest.length ? hardest.join(", ") : "ei vielä havaittu"}</strong></p><p>Paras vastausputki: <strong>${progress.bestStreak}</strong></p>
    <p class="privacy-note">Edistyminen säilyy tällä laitteella myös uudelleenkäynnistyksen jälkeen. Varmuuskopion voi siirtää toiselle laitteelle.</p>
    <div class="backup-actions"><button id="exportBackup">Lataa varmuuskopio</button><button id="importBackup">Palauta tiedostosta</button><input id="backupFile" type="file" accept="application/json,.json" hidden></div>
    ${backupMessage ? `<p class="backup-message" role="status">${backupMessage}</p>` : ""}
    ${resetArmed ? `<div class="reset-confirm"><strong>Nollataanko kaikki edistyminen?</strong><div><button id="cancelReset">Peruuta</button><button id="confirmReset">Kyllä, nollaa</button></div></div>` : `<button id="reset">Aloita alusta</button>`}
    <button id="logout">Kirjaudu ulos</button></div></details>`;
}

function gameView(level) {
  const progressWidth = Math.min(100, (session.total / session.goal) * 100);
  const waiting = ["success", "reveal", "levelup", "tableComplete", "finaleComplete", "dailyComplete"].includes(feedback?.kind);
  return `<section class="game-card"><div class="level-title"><div><span>${progress.mode === "daily" ? "Pieni harjoitus joka päivä" : progress.mode === "tables" ? "Yksi taulu kerrallaan" : `Taso ${level.id}`}</span><h1>${level.name}</h1></div><div class="streak">🔥 ${streak}</div></div>
    <p class="level-description">${level.description}</p><div class="progress-track"><div style="width:${progressWidth}%"></div></div>
    <small class="progress-label">${session.total} / ${session.goal} tehtävää · ${isFinale() ? "⏱ nopea vastaus antaa enemmän tähtiä" : progress.mode === "daily" ? "päivän sopiva annos" : "vähintään 80 % oikein"}</small>
    <div class="problem" aria-live="polite"><span>${question.a}</span><span class="operator">×</span><span>${question.b}</span><span class="operator">=</span><span class="answer ${answer ? "filled" : ""}">${answer || "?"}</span></div>
    ${feedback ? `<div class="feedback ${feedback.kind}" role="status">${feedback.text}</div>${feedback.hasAlternatives ? `<button class="another-hint" id="anotherHint">🔄 Näytä toinen tapa</button>` : ""}` : isFinale() ? `<div class="finale-rules">⚡ Alle 3 s: +5 ⭐ · alle 6 s: +4 ⭐ · alle 10 s: +3 ⭐ · väärä: −2 ⭐</div>` : `<button class="hint-button" id="hint">💡 Anna ajatteluvinkki</button>`}
    ${waiting ? `<button class="primary" id="next">${feedback.kind === "dailyComplete" ? "Uusi päivän kierros" : feedback.kind === "levelup" && level.id < LEVELS.length ? "Seuraava taso" : ["tableComplete", "finaleComplete"].includes(feedback.kind) ? "Uusi kierros" : "Seuraava tehtävä"} →</button>` : `<div class="keypad">${[1,2,3,4,5,6,7,8,9,"back",0,"ok"].map((key) => `<button data-key="${key}" class="${key === "ok" ? "ok" : ""}">${key === "back" ? "⌫" : key === "ok" ? "✓" : key}</button>`).join("")}</div>`}
  </section>`;
}

function render() {
  const level = currentLesson(); const reward = selectedReward();
  app.className = `theme-${reward.id}`;
  app.innerHTML = `<header class="topbar"><div><span class="logo">✦</span><strong>Kertotaikuri</strong></div><div class="player-summary"><div class="profile"><span>${REWARD_ICONS[reward.id]}</span>${progress.playerName}</div><div class="score">⭐ ${progress.stars}</div></div></header>
    <nav class="mode-tabs"><button data-mode="learn" class="${progress.mode === "learn" ? "current" : ""}">Opettele</button><button data-mode="tables" class="${progress.mode === "tables" ? "current" : ""}">Yksi taulu</button><button data-mode="daily" class="${progress.mode === "daily" ? "current" : ""}">Päivän 10</button><button data-mode="path" class="${progress.mode === "path" ? "current" : ""}">Polku</button></nav>
    ${["learn", "tables"].includes(progress.mode) ? `<section class="table-map">${tableMap()}</section>` : progress.mode === "path" ? `<section class="journey">${levelMap()}</section>` : `<div class="daily-banner">${progress.dailyHistory?.[todayKey()] ? "✅ Päivän kierros on jo tehty – saat silti harjoitella lisää!" : "🌞 Tänään odottaa 10 sopivaa tehtävää."}</div>`}
    ${progress.mode === "learn" ? learnView() : gameView(level)}${rewardsView()}${parentView()}`;

  app.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  app.querySelectorAll("[data-table]").forEach((button) => button.addEventListener("click", () => setTable(Number(button.dataset.table))));
  app.querySelectorAll("[data-level]").forEach((button) => button.addEventListener("click", () => setLevel(Number(button.dataset.level))));
  app.querySelectorAll("[data-key]").forEach((button) => button.addEventListener("click", () => button.dataset.key === "ok" ? submitAnswer() : handleKey(button.dataset.key)));
  app.querySelectorAll("[data-mastery-table]").forEach((button) => button.addEventListener("click", () => { progress.selectedTable = Number(button.dataset.masteryTable); setMode("tables"); }));
  app.querySelectorAll("[data-reward]").forEach((button) => button.addEventListener("click", () => { progress.selectedRewardId = button.dataset.reward; saveProgress(progress); render(); }));
  app.querySelector("#hint")?.addEventListener("click", () => { showHint(); render(); });
  app.querySelector("#anotherHint")?.addEventListener("click", () => { showHint(true); render(); });
  app.querySelector("#learnPrev")?.addEventListener("click", () => { learnStep = Math.max(0, learnStep - 1); render(); });
  app.querySelector("#learnNext")?.addEventListener("click", () => { learnStep = learnStep === 10 ? 0 : learnStep + 1; render(); });
  app.querySelector("#practiceThis")?.addEventListener("click", () => setMode("tables"));
  app.querySelector("#next")?.addEventListener("click", () => {
    if (feedback.kind === "levelup" && level.id < LEVELS.length) setLevel(level.id + 1);
    else if (["tableComplete", "finaleComplete", "dailyComplete"].includes(feedback.kind)) { newSession(); render(); }
    else nextQuestion();
  });
  app.querySelector("#reset")?.addEventListener("click", () => { resetArmed = true; render(); });
  app.querySelector("#cancelReset")?.addEventListener("click", () => { resetArmed = false; render(); });
  app.querySelector("#confirmReset")?.addEventListener("click", () => { resetProgress(); progress = initialProgress(); resetArmed = false; streak = 0; newSession(); render(); });
  app.querySelector("#logout")?.addEventListener("click", () => { sessionStorage.removeItem(LOGIN_SESSION_KEY); loggedIn = false; renderLogin(); });
  app.querySelector("#exportBackup")?.addEventListener("click", exportBackup);
  app.querySelector("#importBackup")?.addEventListener("click", () => app.querySelector("#backupFile").click());
  app.querySelector("#backupFile")?.addEventListener("change", importBackup);
}

function exportBackup() {
  const blob = new Blob([createProgressBackup(progress)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `kertotaikuri-varmuuskopio-${todayKey()}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  backupMessage = "Varmuuskopio ladattu."; render();
}

async function importBackup(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    progress = parseProgressBackup(await file.text()); saveProgress(progress); backupMessage = "Edistyminen palautettu onnistuneesti."; newSession();
  } catch { backupMessage = "Tiedostoa ei voitu palauttaa. Valitse Kertotaikurin JSON-varmuuskopio."; }
  render();
}

if (loggedIn) startGame(); else renderLogin();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
