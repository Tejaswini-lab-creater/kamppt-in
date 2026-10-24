(() => {
  "use strict";

  const STORE = "kamppt-app-v1";
  const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Marathi", "Bengali", "Spanish", "French", "German", "Arabic", "Chinese", "Japanese"];
  const NAMES = { home: "Home", explain: "Explain", quiz: "Quiz", summarize: "Summarize", flashcards: "Flashcards", tutor: "AI Tutor", timetable: "Timetable", timer: "Timer", performance: "Performance", history: "History", settings: "Settings" };
  const TOOLS = [
    ["explain", "💡", "Explain & Notes", "Understand any topic"],
    ["quiz", "📝", "Quiz", "From any topic or notes"],
    ["flashcards", "🃏", "Flashcards", "Flip & memorize"],
    ["tutor", "🤖", "AI Tutor", "Ask anything"],
    ["summarize", "📄", "Summarize", "Key points fast"],
    ["timetable", "🗓️", "Timetable", "Plan your week"],
    ["timer", "⏱️", "Study Timer", "Focus sessions"]
  ];
  const defaults = { theme: "neon", language: "English", apiKey: "", history: [], scores: [], minutes: 0, sessions: 0, chats: [], cards: [], plan: null, provider: "free" };
  const el = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  let state = load();
  let quiz = null;
  let cardIndex = 0;
  let flipped = false;
  let timerRemaining = 25 * 60;
  let timerLength = 25 * 60;
  let timerInterval = null;
  let timerActive = false;
  let page = "home";

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
      return { ...defaults, ...saved, history: Array.isArray(saved.history) ? saved.history : [], scores: Array.isArray(saved.scores) ? saved.scores : [], chats: Array.isArray(saved.chats) ? saved.chats : [] };
    } catch { return { ...defaults }; }
  }
  function save() { localStorage.setItem(STORE, JSON.stringify(state)); }
  function notify(message, isError = false) {
    const toast = document.createElement("div");
    toast.className = `toast${isError ? " error" : ""}`;
    toast.textContent = message;
    el("#toasts").append(toast);
    setTimeout(() => toast.remove(), 3600);
  }
  function dateText(date) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(date)); }
  function addHistory(type, title, detail = "") {
    state.history.unshift({ type, title, detail, at: new Date().toISOString() });
    state.history = state.history.slice(0, 100);
    save();
  }
  function intro(label, title, description) {
    return `<div class="page-intro"><div><p class="eyebrow">${label}</p><h1>${title}</h1><p class="sub">${description}</p></div></div>`;
  }
  function empty(text) { return `<div class="empty">${text}</div>`; }
  function row(item) {
    const icons = { explain: "💡", quiz: "📝", summarize: "📄", flashcards: "🃏", tutor: "🤖", timetable: "🗓️", timer: "⏱️" };
    return `<div class="row"><span class="stat-icon">${icons[item.type] || "✦"}</span><div><div class="row-title">${escapeHtml(item.title)}</div><div class="row-detail">${escapeHtml(item.detail || NAMES[item.type] || "")}</div></div><span class="row-date">${dateText(item.at)}</span></div>`;
  }
  function average() { return state.scores.length ? Math.round(state.scores.reduce((sum, score) => sum + score.percent, 0) / state.scores.length) : "—"; }

  function renderHome() {
    return `<section class="hero"><p class="eyebrow">SMARTER TOMORROW</p><h1>Hello 👋<br>What will you learn today?</h1><p class="sub">Your study space for understanding new topics, practicing what you know, and making progress one day at a time.</p><div class="hero-actions"><a class="button" href="#tutor">🧠 Ask KAM PPT anything… →</a><a class="button secondary" href="#timer">⏱️ Start a focus session</a></div></section>
      <div class="stats"><div class="stat"><span class="stat-icon">📝</span><div><strong>${state.scores.length}</strong><small>Quizzes taken</small></div></div><div class="stat"><span class="stat-icon">↗</span><div><strong>${average()}${average() === "—" ? "" : "%"}</strong><small>Avg. score</small></div></div><div class="stat"><span class="stat-icon">⏱️</span><div><strong>${state.minutes}</strong><small>Minutes studied</small></div></div></div>
      <div class="section-title"><h2>Explore tools</h2><span class="tag">Pick your next step</span></div><div class="tool-grid">${TOOLS.map(([id, icon, title, desc]) => `<a href="#${id}" class="tool-card"><span class="stat-icon">${icon}</span><h3>${title}</h3><p>${desc}</p></a>`).join("")}</div>
      <div class="home-bottom"><section class="panel pad"><div class="section-title"><h2>Recent activity</h2><a class="button ghost small" href="#history">View history</a></div>${state.history.slice(0, 4).map(row).join("") || empty("Your study activity will appear here as you learn.")}</section><section class="panel pad"><div class="section-title"><h2>This week's plan</h2><a class="button ghost small" href="#timetable">Open timetable</a></div>${state.plan ? `<p class="sub">Your weekly plan is ready. Keep your sessions balanced and make time to recharge.</p>` : empty("Create a weekly timetable to give your study sessions a little structure.")}</section></div>`;
  }
  function formPage(id, eyebrow, title, desc, fields, resultId) {
    return `${intro(eyebrow, title, desc)}<section class="panel form-panel"><form class="form" id="${id}-form">${fields}</form>${resultId ? `<div id="${resultId}"></div>` : ""}</section>`;
  }
  function renderExplain() {
    return formPage("explain", "UNDERSTAND IT YOUR WAY", "Explain & Notes", "Turn a topic or question into a clear explanation and useful revision notes.", `<div class="field"><label for="topic">Topic</label><input class="input" id="topic" name="topic" placeholder="Topic, e.g. Photosynthesis" required></div><div class="field"><label for="detail">Add context or notes (optional)</label><textarea class="textarea short" id="detail" name="detail" placeholder="Paste a passage, question, or your class notes..."></textarea></div><div class="field"><label for="level">Explanation level</label><select class="select" id="level" name="level"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div class="actions"><button class="button" type="submit">Explain</button><span class="hint">Language: ${escapeHtml(state.language)}</span></div>`, "explain-result");
  }
  function renderSummarize() {
    return formPage("summarize", "KEY POINTS FAST", "Summarize", "Get the key ideas from notes or reading in a format that is easier to review.", `<div class="field"><label for="summary-source">Text to summarize</label><textarea class="textarea" id="summary-source" name="text" placeholder="Paste your notes or reading here..." required></textarea></div><div class="field-row"><div class="field"><label for="summary-style">Summary style</label><select class="select" id="summary-style" name="style"><option value="concise">Concise key points</option><option value="balanced">Balanced outline</option><option value="detailed">Detailed revision notes</option></select></div><div class="field"><label for="summary-subject">Subject (optional)</label><input class="input" id="summary-subject" name="subject" placeholder="e.g. Biology"></div></div><div class="actions"><button class="button" type="submit">📄 Summarize</button><span class="hint">Language: ${escapeHtml(state.language)}</span></div>`, "summary-result");
  }
  function renderQuiz() {
    return `${intro("PRACTICE & CHECK YOURSELF", "Quiz", "Create a multiple-choice quiz from a topic or your own study notes.")}<section class="panel form-panel"><form class="form" id="quiz-form"><div class="field"><label for="quiz-source">Topic or notes</label><textarea class="textarea" id="quiz-source" name="source" placeholder="Topic or paste notes to be quizzed on…" required></textarea></div><div class="field"><label for="quiz-count">Number of questions</label><select class="select" id="quiz-count" name="count"><option value="5">5</option><option value="8">8</option><option value="10">10</option></select></div><div class="actions"><button class="button" type="submit">Start quiz</button></div></form><div id="quiz-result"></div></section>`;
  }
  function renderFlashcards() {
    const card = state.cards.length ? `<section class="panel result"><div class="section-title"><h2>${escapeHtml(state.cardsTitle || "Your flashcards")}</h2><span class="tag">${state.cards.length} cards</span></div><div class="flashcard" id="flashcard" role="button" tabindex="0" aria-label="Flip card"><div><div class="flash-label">${flipped ? "Answer · tap to flip" : "Question · tap to flip"}</div><div class="flash-text">${escapeHtml(flipped ? state.cards[cardIndex].back : state.cards[cardIndex].front)}</div></div></div><div class="flash-controls"><button class="button ghost small" data-action="card-prev">← Previous</button><span class="flash-count">${cardIndex + 1} / ${state.cards.length}</span><button class="button ghost small" data-action="card-next">Next →</button><button class="button secondary small" data-action="card-known">✓ Got it</button></div></section>` : "";
    return `${intro("FLIP & MEMORIZE", "Flashcards", "Make a set from your notes, then practice recalling the key ideas.")}<section class="panel form-panel"><form class="form" id="cards-form"><div class="field"><label for="cards-source">Topic or notes</label><textarea class="textarea short" id="cards-source" name="source" placeholder="Paste terms, definitions, or notes here..." required></textarea></div><div class="field-row"><div class="field"><label for="cards-subject">Subject (optional)</label><input class="input" id="cards-subject" name="subject" placeholder="e.g. Chemistry"></div><div class="field"><label for="cards-count">Number of cards</label><select class="select" id="cards-count" name="count"><option value="6">6 cards</option><option value="10">10 cards</option><option value="14">14 cards</option></select></div></div><div class="actions"><button class="button" type="submit">🃏 Create flashcards</button></div></form></section>${card}`;
  }
  function renderTutor() {
    const messages = state.chats.map((message) => `<div class="message ${message.role === "user" ? "user" : ""}">${escapeHtml(message.text)}</div>`).join("");
    return `${intro("ASK ANYTHING", "AI Tutor", "Get a patient explanation, study tips, or help working through a tricky question.")}<section class="panel chat"><div class="messages" id="messages">${messages || `<div class="message">Hi! What are you learning today? Ask me to explain a concept, give an example, or help you revise.</div>`}</div><form class="chat-form" id="tutor-form"><input class="input" name="question" aria-label="Ask a question" placeholder="Ask KAM PPT anything…" required><button class="button" type="submit">Send ↑</button></form></section>`;
  }
  function renderTimetable() {
    const plan = state.plan ? `<section class="panel result"><div class="section-title"><h2>Your 7-day timetable</h2><button class="button ghost small" data-action="clear-plan">Clear</button></div><div class="days">${state.plan.map((day) => `<div class="day"><b>${day.name}${day.rest ? " · Rest & review" : ""}</b>${day.tasks.map((task) => `<p>◷ ${task.time} · ${escapeHtml(task.subject)}</p>`).join("") || "<p>Take a break and recharge.</p>"}</div>`).join("")}</div></section>` : "";
    return `${intro("PLAN YOUR WEEK", "Timetable", "Build a realistic study routine with regular sessions and space to rest.")}<section class="panel form-panel"><form class="form" id="plan-form"><div class="field"><label for="subjects">Subjects (comma-separated)</label><textarea class="textarea short" id="subjects" name="subjects" placeholder="e.g. Maths, Biology, History" required></textarea><span class="hint">Add two to seven subjects for a balanced weekly plan.</span></div><div class="field-row"><div class="field"><label for="hours">Study hours per day</label><select class="select" id="hours" name="hours"><option value="2">2 hours</option><option value="3" selected>3 hours</option><option value="4">4 hours</option><option value="5">5 hours</option></select></div><div class="field"><label for="rest">Recovery day</label><select class="select" id="rest" name="rest"><option value="yes">Include a lighter day</option><option value="no">Study all seven days</option></select></div></div><div class="actions"><button class="button" type="submit">🗓️ Generate timetable</button></div></form></section>${plan}`;
  }
  function renderTimer() {
    const mm = String(Math.floor(timerRemaining / 60)).padStart(2, "0");
    const ss = String(timerRemaining % 60).padStart(2, "0");
    return `${intro("FOCUS ONE STEP AT A TIME", "Study Timer", "Choose a session length, put distractions aside, and get started.")}<section class="panel form-panel timer-wrap"><div class="timer-ring"><span class="timer-time">${mm}:${ss}</span></div><p class="timer-caption">${timerActive ? "Stay with it — you're doing great." : "A quiet moment to focus."}</p><div class="presets">${[15, 25, 45].map((min) => `<button class="button ghost small ${timerLength === min * 60 ? "selected" : ""}" data-action="preset" data-minutes="${min}">${min} min</button>`).join("")}</div><div class="timer-actions"><button class="button" data-action="timer-toggle">${timerActive ? "Pause" : "Start focus"}</button><button class="button secondary" data-action="timer-reset">Reset</button></div><p class="hint">Minutes studied: ${state.minutes} · Focus sessions: ${state.sessions}</p></section>`;
  }
  function renderPerformance() {
    const best = state.scores.length ? Math.max(...state.scores.map((score) => score.percent)) : 0;
    return `${intro("SEE HOW FAR YOU'VE COME", "Performance", "Review quiz scores and focused study time to see your progress.")}<div class="stats"><div class="stat"><span class="stat-icon">📝</span><div><strong>${state.scores.length}</strong><small>Quizzes taken</small></div></div><div class="stat"><span class="stat-icon">↗</span><div><strong>${average()}${average() === "—" ? "" : "%"}</strong><small>Average score</small></div></div><div class="stat"><span class="stat-icon">✦</span><div><strong>${best}%</strong><small>Personal best</small></div></div></div><section class="panel pad"><div class="section-title"><h2>Recent quiz scores</h2><a class="button ghost small" href="#quiz">Take a quiz</a></div>${state.scores.slice(0, 8).map((score) => `<div class="row"><div style="flex:1"><div class="row-title">${escapeHtml(score.title)}</div><div class="row-detail">${score.correct}/${score.total} correct · ${dateText(score.at)}</div></div><b>${score.percent}%</b></div>`).join("") || empty("Take a quiz to see your results and track progress here.")}</section>`;
  }
  function renderHistory() {
    return `${intro("YOUR LEARNING JOURNEY", "History", "Look back at what you've studied and the progress you've made.")}<section class="panel pad">${state.history.map(row).join("") || empty("Your study history is empty for now. Your learning sessions will appear here.")}</section>`;
  }
  function renderSettings() {
    return `${intro("MAKE IT YOURS", "Theme & Settings", "Choose how KAM PPT looks, and select the language for your study sessions.")}<section class="panel settings">
      <div class="setting-row"><div><strong>Theme</strong><small>Choose the neon dark look or a brighter light theme.</small></div><div class="actions"><button class="button secondary small" data-action="theme" data-theme-value="neon">Neon (default)</button><button class="button secondary small" data-action="theme" data-theme-value="light">Light</button></div></div>
      <div class="setting-row"><div><strong>AI connection</strong><small>AI tools work with a free service. Or add your own Anthropic key; it stays in this browser and is sent only to Anthropic when you request AI content.</small></div><span class="tag">${state.provider === "anthropic" ? "Anthropic key" : "Free AI"}</span></div>
      <div class="setting-row"><div><strong>Anthropic API key (optional)</strong><small>Stored in this browser's local storage. Leave blank to use the free AI service. Only enter a key on a device you trust.</small></div><input class="input" id="api-key" type="password" autocomplete="off" placeholder="sk-ant-…" value="${escapeHtml(state.apiKey)}"></div>
      <div class="setting-row"><div><strong>Clear all my data</strong><small>Remove your study history, scores, flashcards, timetable, and saved preferences from this browser.</small></div><button class="button danger small" data-action="clear">Clear all my data</button></div>
      </section><p class="hint" style="margin-top:12px">Study data and the optional key are stored locally in this browser. AI prompts are sent to the selected AI provider when you use Explain, Summarize, or AI Tutor.</p>`;
  }

  function render() {
    page = location.hash.slice(1) || "home";
    if (!NAMES[page]) page = "home";
    document.title = `${page === "home" ? "KAM PPT – Smarter Tomorrow" : `${NAMES[page]} – KAM PPT`}`;
    el("#page-name").textContent = NAMES[page];
    document.querySelectorAll("[data-page]").forEach((link) => link.classList.toggle("active", link.dataset.page === page));
    el("#sidebar").classList.remove("open");
    const views = { home: renderHome, explain: renderExplain, quiz: renderQuiz, summarize: renderSummarize, flashcards: renderFlashcards, tutor: renderTutor, timetable: renderTimetable, timer: renderTimer, performance: renderPerformance, history: renderHistory, settings: renderSettings };
    el("#content").innerHTML = views[page]();
  }
  function localExplain(topic, notes, level) {
    const sentences = (notes || topic).replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    const main = sentences[0] || `The central idea is ${topic}.`;
    return `## In simple terms\n${main} Think of ${topic} as a concept you can understand by first learning its main idea, then seeing how its parts connect. ${level === "Beginner" ? "Start with the basic definition and one everyday example." : level === "Advanced" ? "Consider the assumptions, applications, and limitations of this concept." : "Connect the main idea to an example and explain it in your own words."}\n\n## Key notes\n${sentences.slice(0, 5).map((sentence) => `• ${sentence}`).join("\n") || `• Learn the definition of ${topic}.\n• Identify its key parts and how they relate.\n• Try describing it from memory.`}\n\n## Quick check\nCan you explain ${topic} in one sentence and give an example?`;
  }
  function localSummary(text, style) {
    const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    const limit = style === "concise" ? 3 : style === "detailed" ? 9 : 6;
    const selected = sentences.length > limit ? [...new Set([sentences[0], ...sentences.filter((_, index) => index > 0 && index % Math.ceil(sentences.length / (limit - 1)) === 0)])].slice(0, limit) : sentences;
    return `## Main idea\n${sentences[0] || text.slice(0, 200)}\n\n## Key points\n${selected.map((sentence) => `• ${sentence}`).join("\n")}\n\n## Review tip\nClose your notes and try to recall the key points in your own words.`;
  }
  async function generate(prompt, fallback) {
    if (state.apiKey.trim()) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": state.apiKey.trim(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-3-5-haiku-latest", max_tokens: 1400, system: `You are a kind, accurate study helper. Reply in ${state.language}. Use student-friendly language and clear headings.`, messages: [{ role: "user", content: prompt }] })
      });
      if (!response.ok) {
        let message = "";
        try { message = (await response.json()).error?.message || ""; } catch { /* The response may not include JSON error details. */ }
        throw new Error(message || `Anthropic request failed (${response.status}). Check the API key in Settings.`);
      }
      const json = await response.json();
      return json.content.filter((part) => part.type === "text").map((part) => part.text).join("\n").trim();
    }
    try {
      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(`${prompt}\n\nRespond in ${state.language}. Be accurate, concise, and student-friendly.`)}`, { method: "GET", signal: AbortSignal.timeout(16000) });
      if (!response.ok) throw new Error(`Free AI service returned ${response.status}.`);
      const text = (await response.text()).trim();
      if (!text || text.length > 10000) throw new Error("The free AI service returned an unusable response.");
      return text;
    } catch (error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") throw new Error("The free AI service timed out. Try again or add an Anthropic key in Settings.");
      throw new Error(`${error.message || "The free AI service is unavailable."} If it is blocked by your network, add an Anthropic key in Settings.`);
    }
  }
  function formatResult(title, text) {
    const html = escapeHtml(text).replace(/^## (.*)$/gm, "<h3>$1</h3>").replace(/^• (.*)$/gm, "<li>$1</li>").replace(/(<li>.*<\/li>\s*)+/gs, (list) => `<ul>${list}</ul>`).replace(/\n/g, "<br>");
    return `<section class="result"><h2>${escapeHtml(title)}</h2><div class="result-body">${html}</div><div class="result-meta">Language: ${escapeHtml(state.language)} · ${dateText(new Date())}</div></section>`;
  }
  async function submitGeneration(form, kind) {
    const button = form.querySelector('[type="submit"]');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Working…";
    try {
      const data = new FormData(form);
      const resultId = kind === "explain" ? "#explain-result" : "#summary-result";
      let title, prompt, fallback;
      if (kind === "explain") {
        const topic = data.get("topic").trim();
        if (!topic) throw new Error("Enter a topic first.");
        const notes = data.get("detail").trim();
        title = `💡 ${topic}`;
        prompt = `Explain this topic at ${data.get("level")} level, then create concise useful revision notes. Topic: ${topic}${notes ? `\nStudent's notes/context:\n${notes}` : ""}`;
        fallback = localExplain(topic, notes, data.get("level"));
      } else {
        const text = data.get("text").trim();
        if (!text) throw new Error("Paste some text to summarize.");
        title = `📄 ${data.get("subject").trim() || "Study summary"}`;
        prompt = `Summarize the following study material as ${data.get("style")} revision notes. Preserve the facts and do not invent details:\n${text}`;
        fallback = localSummary(text, data.get("style"));
      }
      const result = await generate(prompt, fallback);
      el(resultId).innerHTML = formatResult(title, result);
      addHistory(kind, title, result.slice(0, 75));
      form.reset();
    } catch (error) { notify(error.message || "Couldn't generate a response. Please try again.", true); }
    finally { button.disabled = false; button.textContent = label; }
  }
  function factsFrom(source) {
    const lines = source.split(/\n/).map((line) => line.trim().replace(/^[-•*]\s*/, "")).filter(Boolean);
    return lines.length > 1 ? lines : source.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  }
  function shuffle(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function createQuestions(source, count) {
    const facts = factsFrom(source);
    return Array.from({ length: count }, (_, index) => {
      const fact = facts[index % facts.length];
      const pair = fact.match(/^(.{2,70}?)\s*:\s*(.{3,})$/);
      const definition = fact.match(/^(.{2,70}?)\s+(is|are|was|were|means|refers to)\s+(.+)$/i);
      let prompt;
      let correct;
      if (pair) {
        prompt = `Which description matches ${pair[1].trim()}?`;
        correct = pair[2].replace(/[.!?]$/, "");
      } else if (definition) {
        prompt = `What ${/^(are|were)$/i.test(definition[2]) ? "are" : "is"} ${definition[1].trim()}?`;
        correct = definition[3].replace(/[.!?]$/, "");
      } else {
        prompt = facts.length > 1 ? "According to the notes, which statement is correct?" : `Which statement about ${source.slice(0, 70)} is correct?`;
        correct = fact.replace(/[.!?]$/, "");
      }
      const distractors = [
        `It is unrelated to ${fact.slice(0, 45)}.`,
        `It describes the opposite of ${fact.slice(0, 45)}.`,
        `It is not part of the concept described in the notes.`
      ].filter((choice) => choice.toLowerCase() !== correct.toLowerCase());
      const options = shuffle([correct, ...distractors]).slice(0, 4);
      return { prompt, clue: "", options, answer: options.indexOf(correct) };
    });
  }
  async function showQuiz(form) {
    const data = new FormData(form);
    const source = data.get("source").trim();
    if (!source) return notify("Add a topic or notes before making a quiz.", true);
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = "Creating quiz…";
    const title = source.split(/[.!?\n]/)[0].slice(0, 65);
    let questions;
    try {
      const count = Number(data.get("count"));
      const prompt = `Create exactly ${count} multiple-choice study questions from these notes. Each question must test a distinct point, have 4 plausible options, exactly one correct option, and be appropriate for a student. Do not repeat the notes as both the question and an answer. Respond ONLY as valid JSON: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":0}]}. Notes:\n${source}`;
      const text = await generate(prompt, "");
      const jsonText = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonText.slice(jsonText.indexOf("{"), jsonText.lastIndexOf("}") + 1));
      const candidate = parsed.questions;
      if (!Array.isArray(candidate) || candidate.length !== count ||
          candidate.some((item) => typeof item.question !== "string" || !item.question.trim() || !Array.isArray(item.options) || item.options.length !== 4 ||
            item.options.some((option) => typeof option !== "string" || !option.trim()) || new Set(item.options).size !== 4 ||
            !Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3)) {
        throw new Error("The AI response did not contain valid quiz questions.");
      }
      questions = candidate.slice(0, count).map((item) => ({ prompt: item.question, clue: "", options: item.options, answer: item.answer }));
    } catch (error) {
      if (state.apiKey) notify(`AI quiz unavailable: ${error.message} Creating a quiz from your notes instead.`, true);
      else notify("Free AI quiz generation is unavailable right now. Creating a quiz from your notes instead.");
      questions = createQuestions(source, Number(data.get("count")));
    }
    quiz = { title, questions, complete: false };
    el("#quiz-result").innerHTML = `<section class="result"><div class="section-title"><h2>${escapeHtml(quiz.title)}</h2><span class="tag">${quiz.questions.length} questions</span></div><form id="answers-form">${quiz.questions.map((question, index) => `<div class="question"><div class="question-title">${index + 1}. ${escapeHtml(question.prompt)}${question.clue ? `<br><span class="hint">${escapeHtml(question.clue)}</span>` : ""}</div>${question.options.map((option, optionIndex) => `<label class="option"><input type="radio" name="q${index}" value="${optionIndex}" required><span>${escapeHtml(option)}</span></label>`).join("")}<div class="hint" id="feedback-${index}"></div></div>`).join("")}<div class="actions"><button class="button" type="submit">Check my answers</button></div><div id="score-result"></div></form></section>`;
    submit.disabled = false;
    submit.textContent = label;
  }
  function checkQuiz(form) {
    if (!quiz || quiz.complete) return;
    const answers = new FormData(form);
    if (quiz.questions.some((_, index) => !answers.has(`q${index}`))) return notify("Choose an answer for every question.", true);
    let correct = 0;
    quiz.questions.forEach((question, index) => {
      const selected = Number(answers.get(`q${index}`));
      form.querySelectorAll(`input[name="q${index}"]`).forEach((input) => {
        input.disabled = true;
        if (Number(input.value) === question.answer) input.closest(".option").classList.add("correct");
        else if (Number(input.value) === selected) input.closest(".option").classList.add("wrong");
      });
      const right = selected === question.answer;
      if (right) correct += 1;
      el(`#feedback-${index}`).textContent = right ? "Correct — nice work!" : `Answer: ${question.options[question.answer]}`;
    });
    const percent = Math.round(correct / quiz.questions.length * 100);
    quiz.complete = true;
    state.scores.unshift({ title: quiz.title, correct, total: quiz.questions.length, percent, at: new Date().toISOString() });
    state.scores = state.scores.slice(0, 100);
    save();
    addHistory("quiz", `${quiz.title} quiz`, `${correct}/${quiz.questions.length} correct`);
    el("#score-result").innerHTML = `<div class="score"><b>${percent}%</b> · ${correct} out of ${quiz.questions.length} correct. ${percent === 100 ? "Fantastic work!" : "Every question is a chance to learn."}</div>`;
    form.querySelector('[type="submit"]').remove();
  }
  function createCards(form) {
    const data = new FormData(form);
    const source = data.get("source").trim();
    if (!source) return notify("Add a topic or notes first.", true);
    const facts = factsFrom(source);
    state.cards = Array.from({ length: Number(data.get("count")) }, (_, index) => {
      const fact = facts[index % facts.length];
      const match = fact.match(/^(.{2,65}?)\s+(?:is|are|means|refers to|:)\s+(.+)$/i);
      return match ? { front: `What is ${match[1].trim()}?`, back: match[2].replace(/[.!?]$/, "") } : { front: `What is the key idea in "${fact.slice(0, 75)}${fact.length > 75 ? "…" : ""}"?`, back: fact };
    });
    state.cardsTitle = data.get("subject").trim() || "Your flashcards";
    cardIndex = 0;
    flipped = false;
    save();
    addHistory("flashcards", `Created ${state.cards.length} flashcards`, state.cardsTitle);
    render();
  }
  function createPlan(form) {
    const data = new FormData(form);
    const subjects = data.get("subjects").split(/[,\n;]+/).map((item) => item.trim()).filter(Boolean).slice(0, 7);
    if (subjects.length < 2) return notify("Add at least two subjects for your timetable.", true);
    const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    state.plan = names.map((name, index) => {
      if (index === 6 && data.get("rest") === "yes") return { name, rest: true, tasks: [] };
      const selections = [...new Set([subjects[index % subjects.length], subjects[(index + 2) % subjects.length]])];
      const slots = Math.max(1, Math.min(3, Number(data.get("hours")) - 1));
      return { name, rest: false, tasks: Array.from({ length: slots }, (_, i) => ({ time: ["9:00 AM", "1:00 PM", "4:00 PM"][i], subject: selections[i % selections.length] })) };
    });
    save();
    addHistory("timetable", "Created a weekly timetable", `${subjects.length} subjects`);
    render();
  }
  function sendTutor(form) {
    const question = new FormData(form).get("question").trim();
    if (!question) return;
    state.chats.push({ role: "user", text: question });
    state.chats = state.chats.slice(-30);
    const history = state.chats.slice(-8);
    save();
    render();
    const input = el("#tutor-form input");
    const submit = el("#tutor-form button");
    input.disabled = true;
    submit.disabled = true;
    const fallback = `Let's work through this together. First, identify the main idea in your question: "${question}". Break it into smaller pieces, define any key terms, and connect them to an example you know. If you share a specific problem or passage, I can help you reason through it step by step.`;
    generate(history.map((message) => `${message.role === "user" ? "Student" : "Tutor"}: ${message.text}`).join("\n\n"), fallback).then((answer) => {
      state.chats.push({ role: "assistant", text: answer });
      state.chats = state.chats.slice(-30);
      save();
      addHistory("tutor", "Asked KAM PPT AI Tutor", question.slice(0, 60));
      render();
    }).catch((error) => {
      state.chats.pop();
      save();
      render();
      notify(error.message || "The tutor couldn't respond. Try again.", true);
    });
  }
  function toggleTimer() {
    if (timerActive) {
      clearInterval(timerInterval);
      timerActive = false;
      render();
      return;
    }
    timerActive = true;
    timerInterval = setInterval(() => {
      timerRemaining -= 1;
      if (timerRemaining <= 0) {
        timerRemaining = 0;
        timerActive = false;
        clearInterval(timerInterval);
        state.minutes += Math.round(timerLength / 60);
        state.sessions += 1;
        save();
        addHistory("timer", `${Math.round(timerLength / 60)}-minute focus session`, "Completed");
        notify("Focus session complete — take a well-earned break!");
      }
      if (page === "timer") render();
    }, 1000);
    render();
  }
  function resetTimer() {
    clearInterval(timerInterval);
    timerActive = false;
    timerRemaining = timerLength;
    render();
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.id === "explain-form" || form.id === "summarize-form") submitGeneration(form, form.id === "explain-form" ? "explain" : "summarize");
    else if (form.id === "quiz-form") showQuiz(form);
    else if (form.id === "answers-form") checkQuiz(form);
    else if (form.id === "cards-form") createCards(form);
    else if (form.id === "plan-form") createPlan(form);
    else if (form.id === "tutor-form") sendTutor(form);
  });
  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (action) {
      switch (action.dataset.action) {
        case "timer-toggle": toggleTimer(); break;
        case "timer-reset": resetTimer(); break;
        case "preset":
          if (!timerActive) { timerLength = Number(action.dataset.minutes) * 60; timerRemaining = timerLength; render(); }
          break;
        case "card-prev":
          cardIndex = (cardIndex - 1 + state.cards.length) % state.cards.length; flipped = false; render(); break;
        case "card-next":
          cardIndex = (cardIndex + 1) % state.cards.length; flipped = false; render(); break;
        case "card-known":
          notify("Nice work — keep it up!");
          cardIndex = (cardIndex + 1) % state.cards.length; flipped = false; render(); break;
        case "clear-plan": state.plan = null; save(); render(); break;
        case "theme": state.theme = action.dataset.themeValue; save(); setTheme(); render(); break;
        case "clear":
          if (confirm("Clear all KAM PPT data saved in this browser? This cannot be undone.")) {
            localStorage.removeItem(STORE);
            state = load();
            save();
            setTheme();
            render();
            notify("All study data cleared.");
          }
          break;
      }
      return;
    }
    if (event.target.closest("#flashcard")) {
      flipped = !flipped;
      render();
    }
  });
  document.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.closest("#flashcard")) {
      event.preventDefault();
      flipped = !flipped;
      render();
    }
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "language-select") {
      state.language = LANGUAGES.includes(event.target.value) ? event.target.value : "English";
      save();
      notify(`Study language set to ${state.language}.`);
    }
    if (event.target.id === "api-key") {
      state.apiKey = event.target.value.trim();
      state.provider = state.apiKey ? "anthropic" : "free";
      save();
      notify(state.apiKey ? "Anthropic API key saved in this browser." : "Using the free AI service.");
      render();
    }
  });
  function setTheme() {
    document.documentElement.dataset.theme = state.theme === "light" ? "light" : "neon";
    el("#theme-toggle").textContent = state.theme === "light" ? "☾" : "☼";
  }
  el("#theme-toggle").addEventListener("click", () => {
    state.theme = state.theme === "light" ? "neon" : "light";
    save();
    setTheme();
  });
  el("#menu-toggle").addEventListener("click", () => el("#sidebar").classList.toggle("open"));
  el("#language-select").value = LANGUAGES.includes(state.language) ? state.language : "English";
  window.addEventListener("hashchange", render);
  setTheme();
  render();
})();
