import { LEVELS, canCompleteLevel, levelById } from "./domain/curriculum.js";
import { createQuestion, createTableQuestion, difficultFacts, recordFact } from "./domain/question.js";
import { encouragement, hintsFor } from "./domain/hints.js";
import { finalePoints } from "./domain/finaleScoring.js";
import { initialProgress, loadProgress, resetProgress, saveProgress } from "./data/progressStore.js";

const app = document.querySelector("#app");
let progress = loadProgress();
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

const isFinale = () => progress.mode === "path" && progress.selectedLevel === LEVELS.length;

function currentLesson() {
  if (progress.mode === "tables") {
    return {
      id: `table-${progress.selectedTable}`,
      name: `${progress.selectedTable}:n kertotaulu`,
      tables: [progress.selectedTable],
      goal: 15,
      description: `Kaikki ${progress.selectedTable}:n kertolaskut 0–10 ja vaikeat laskut uudelleen.`
    };
  }
  return levelById(progress.selectedLevel);
}

function createLessonQuestion(lesson, previousKey = "") {
  if (progress.mode === "tables") {
    const next = createTableQuestion(progress.selectedTable, session.askedKeys, progress.factStats, Math.random, previousKey);
    if (!session.askedKeys.includes(next.key)) session.askedKeys.push(next.key);
    return next;
  }
  return createQuestion(lesson, progress.factStats, Math.random, previousKey);
}

function newSession() {
  const lesson = currentLesson();
  session = { total: 0, correct: 0, goal: lesson.goal, askedKeys: [] };
  question = createLessonQuestion(lesson);
  questionStartedAt = performance.now();
  answer = "";
  attempts = 0;
  usedHint = false;
  hintIndex = 0;
  feedback = null;
}

function setMode(mode) {
  progress.mode = mode;
  saveProgress(progress);
  newSession();
  render();
}

function setTable(table) {
  progress.selectedTable = table;
  saveProgress(progress);
  newSession();
  render();
}

function setLevel(id) {
  if (id > progress.unlockedLevel) return;
  progress.selectedLevel = id;
  saveProgress(progress);
  newSession();
  render();
}

function nextQuestion() {
  question = createLessonQuestion(currentLesson(), question.key);
  questionStartedAt = performance.now();
  answer = "";
  attempts = 0;
  usedHint = false;
  hintIndex = 0;
  feedback = null;
  render();
}

function submitAnswer() {
  if (!answer || feedback?.kind === "success" || feedback?.kind === "reveal") return;
  const isCorrect = Number(answer) === question.answer;
  attempts += 1;
  if (isFinale()) {
    submitFinaleAnswer(isCorrect);
    return;
  }
  if (isCorrect) {
    const masteredWithoutHelp = attempts === 1 && !usedHint;
    session.total += 1;
    session.correct += masteredWithoutHelp ? 1 : 0;
    streak += 1;
    const earned = masteredWithoutHelp ? 2 : 1;
    progress.stars += earned;
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    progress.factStats = recordFact(progress.factStats, question, masteredWithoutHelp);
    feedback = { kind: "success", text: `${encouragement(streak)} +${earned} ⭐` };
    if (canCompleteLevel(session)) completeLesson();
    saveProgress(progress);
  } else if (attempts === 1) {
    streak = 0;
    showHint();
    answer = "";
  } else {
    session.total += 1;
    streak = 0;
    progress.factStats = recordFact(progress.factStats, question, false);
    feedback = { kind: "reveal", text: `Vastaus on ${question.answer}. Ei haittaa – tämä tulee pian uudelleen!` };
    saveProgress(progress);
  }
  render();
}

function submitFinaleAnswer(isCorrect) {
  const elapsedMs = performance.now() - questionStartedAt;
  const points = finalePoints(elapsedMs, isCorrect);
  session.total += 1;
  if (isCorrect) {
    session.correct += 1;
    streak += 1;
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    progress.factStats = recordFact(progress.factStats, question, true);
    feedback = { kind: "success", text: `Oikein ${(elapsedMs / 1000).toFixed(1)} sekunnissa! +${points} ⭐` };
  } else {
    streak = 0;
    progress.factStats = recordFact(progress.factStats, question, false);
    feedback = { kind: "reveal", text: `Vastaus on ${question.answer}. −2 ⭐ – seuraava voi jo onnistua!` };
  }
  progress.stars = Math.max(0, progress.stars + points);
  if (session.total >= session.goal) completeFinale();
  saveProgress(progress);
  render();
}

function completeFinale() {
  if (!progress.completedLevels.includes(LEVELS.length)) progress.completedLevels.push(LEVELS.length);
  const accuracy = Math.round((session.correct / session.total) * 100);
  feedback = {
    kind: "finaleComplete",
    text: `Grande finale valmis! Sait ${session.correct}/${session.total} oikein (${accuracy} %). 🏆`
  };
}

function showHint(next = false) {
  const hints = hintsFor(question.a, question.b);
  usedHint = true;
  if (next) hintIndex = (hintIndex + 1) % hints.length;
  feedback = {
    kind: "hint",
    text: hints.length > 1 ? `<strong>Tapa ${hintIndex + 1}/${hints.length}:</strong> ${hints[hintIndex]}` : hints[0],
    hasAlternatives: hints.length > 1
  };
}

function completeLesson() {
  if (progress.mode === "tables") {
    const table = progress.selectedTable;
    if (!progress.completedTables.includes(table)) {
      progress.completedTables.push(table);
      progress.stars += 10;
    }
    feedback = { kind: "tableComplete", text: `Hienoa! Harjoittelit koko ${table}:n kertotaulun. +10 ⭐` };
    return;
  }
  const id = progress.selectedLevel;
  if (!progress.completedLevels.includes(id)) {
    progress.completedLevels.push(id);
    progress.stars += 10;
  }
  progress.unlockedLevel = Math.min(LEVELS.length, Math.max(progress.unlockedLevel, id + 1));
  feedback = {
    kind: "levelup",
    text: id === LEVELS.length ? "Olet Kertotaikuri! Kaikki taulut ovat hallussa. 🏆" : "Taso läpäisty – uusi maailma aukesi! +10 ⭐"
  };
}

function handleKey(value) {
  if (value === "back") answer = answer.slice(0, -1);
  else if (answer.length < 3) answer += value;
  render();
}

function levelMap() {
  return LEVELS.map((level) => {
    const locked = level.id > progress.unlockedLevel;
    const completed = progress.completedLevels.includes(level.id);
    const current = level.id === progress.selectedLevel;
    return `<button class="level ${current ? "current" : ""}" data-level="${level.id}" ${locked ? "disabled" : ""} aria-label="${level.name}${locked ? ", lukittu" : ""}">
      <span>${locked ? "🔒" : completed ? "⭐" : level.id}</span><small>${level.name}</small>
    </button>`;
  }).join("");
}

function tableMap() {
  return Array.from({ length: 11 }, (_, table) => {
    const completed = progress.completedTables.includes(table);
    const current = table === progress.selectedTable;
    return `<button class="table-choice ${current ? "current" : ""}" data-table="${table}" aria-label="${table}:n kertotaulu${completed ? ", harjoiteltu" : ""}">
      ${completed ? "⭐" : table}
    </button>`;
  }).join("");
}

function render() {
  const level = currentLesson();
  const hardest = difficultFacts(progress.factStats);
  const progressWidth = Math.min(100, (session.total / session.goal) * 100);
  const waiting = feedback?.kind === "success" || feedback?.kind === "reveal" || feedback?.kind === "levelup" || feedback?.kind === "tableComplete" || feedback?.kind === "finaleComplete";
  app.innerHTML = `
    <header class="topbar">
      <div><span class="logo">✦</span><strong>Kertotaikuri</strong></div>
      <div class="player-summary">
        <div class="profile" aria-label="Pelaaja ${progress.playerName}"><span>${progress.playerName.slice(0, 1)}</span>${progress.playerName}</div>
        <div class="score" aria-label="Tähdet">⭐ ${progress.stars}</div>
      </div>
    </header>
    <nav class="mode-tabs" aria-label="Harjoittelutapa">
      <button data-mode="tables" class="${progress.mode === "tables" ? "current" : ""}">Yksi kertotaulu</button>
      <button data-mode="path" class="${progress.mode === "path" ? "current" : ""}">Oppimispolku</button>
    </nav>
    ${progress.mode === "tables"
      ? `<section class="table-map" aria-label="Valitse kertotaulu">${tableMap()}</section>`
      : `<section class="journey" aria-label="Tasot">${levelMap()}</section>`}
    <section class="game-card">
      <div class="level-title"><div><span>${progress.mode === "tables" ? "Yksi taulu kerrallaan" : `Taso ${level.id}`}</span><h1>${level.name}</h1></div><div class="streak">🔥 ${streak}</div></div>
      <p class="level-description">${level.description}</p>
      <div class="progress-track" aria-label="Tason edistyminen"><div style="width:${progressWidth}%"></div></div>
      <small class="progress-label">${session.total} / ${session.goal} tehtävää · ${isFinale() ? "⏱ nopea vastaus antaa enemmän tähtiä" : "vähintään 80 % oikein"}</small>
      <div class="problem" aria-live="polite">
        <span>${question.a}</span><span class="operator">×</span><span>${question.b}</span><span class="operator">=</span>
        <span class="answer ${answer ? "filled" : ""}">${answer || "?"}</span>
      </div>
      ${feedback ? `<div class="feedback ${feedback.kind}" role="status">${feedback.text}</div>${feedback.hasAlternatives ? `<button class="another-hint" id="anotherHint">🔄 Näytä toinen tapa</button>` : ""}` : isFinale() ? `<div class="finale-rules">⚡ Alle 3 s: +5 ⭐ · alle 6 s: +4 ⭐ · alle 10 s: +3 ⭐ · väärä: −2 ⭐</div>` : `<button class="hint-button" id="hint">💡 Anna ajatteluvinkki</button>`}
      ${waiting ? `<button class="primary" id="next">${feedback.kind === "levelup" && level.id < LEVELS.length ? "Seuraava taso" : feedback.kind === "tableComplete" ? "Uusi kierros" : feedback.kind === "finaleComplete" ? "Uusi finaali" : "Seuraava tehtävä"} →</button>` : `
        <div class="keypad" aria-label="Numeronäppäimistö">
          ${[1,2,3,4,5,6,7,8,9,"back",0,"ok"].map((key) => `<button data-key="${key}" class="${key === "ok" ? "ok" : ""}">${key === "back" ? "⌫" : key === "ok" ? "✓" : key}</button>`).join("")}
        </div>`}
    </section>
    <details class="grownups" ${resetArmed ? "open" : ""}><summary>Aikuiselle</summary>
      <p>Edistyminen tallentuu tähän laitteeseen. Tehtävät painottavat asioita, jotka tarvitsevat harjoitusta.</p>
      <p>Paras vastausputki: <strong>${progress.bestStreak}</strong></p>
      <p>Vaikeat laskut: <strong>${hardest.length ? hardest.join(", ") : "ei vielä havaittu"}</strong></p>
      ${resetArmed ? `<div class="reset-confirm" role="alert"><strong>Nollataanko kaikki edistyminen?</strong><div><button id="cancelReset">Peruuta</button><button id="confirmReset">Kyllä, nollaa</button></div></div>` : `<button id="reset">Aloita alusta</button>`}
    </details>
  `;

  app.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  app.querySelectorAll("[data-table]").forEach((button) => button.addEventListener("click", () => setTable(Number(button.dataset.table))));
  app.querySelectorAll("[data-level]").forEach((button) => button.addEventListener("click", () => setLevel(Number(button.dataset.level))));
  app.querySelectorAll("[data-key]").forEach((button) => button.addEventListener("click", () => button.dataset.key === "ok" ? submitAnswer() : handleKey(button.dataset.key)));
  app.querySelector("#hint")?.addEventListener("click", () => { showHint(); render(); });
  app.querySelector("#anotherHint")?.addEventListener("click", () => { showHint(true); render(); });
  app.querySelector("#next")?.addEventListener("click", () => {
    if (feedback.kind === "levelup" && level.id < LEVELS.length) setLevel(level.id + 1);
    else if (feedback.kind === "tableComplete") {
      newSession();
      render();
    }
    else if (feedback.kind === "finaleComplete") {
      newSession();
      render();
    }
    else nextQuestion();
  });
  app.querySelector("#reset")?.addEventListener("click", () => { resetArmed = true; render(); });
  app.querySelector("#cancelReset")?.addEventListener("click", () => { resetArmed = false; render(); });
  app.querySelector("#confirmReset")?.addEventListener("click", () => {
    resetProgress();
    progress = initialProgress();
    resetArmed = false;
    streak = 0;
    newSession();
    render();
  });
}

newSession();
render();

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
