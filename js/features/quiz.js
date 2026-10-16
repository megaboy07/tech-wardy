/**
 * quiz.js — تحدي الوعي.
 * نبض القلب داخل اللعبة فقط + إحصائيات محلية + Confetti.
 */

import { $, el, clear } from "../core/dom.js";
import { sample, shuffle } from "../core/utils.js";
import { supabase } from "../core/supabase.js";
import { QUIZ } from "../config.js";
import { questions } from "../data/questions.js";
import { refreshQuizCount } from "./impact-counters.js";

const ui = {};

const state = {
    round: [],
    index: 0,
    score: 0,
    streak: 0,
    answered: false,
    finished: false,
    timerId: null,
    timeLeft: 0,
    paused: false,
    lastTick: 0,
};

// ============================================================
// الإحصائيات المحلية
// ============================================================

const STATS_KEY = "techwardi:quiz-stats";

function readStats() {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return { best: 0, last: 0, plays: 0 };
        const p = JSON.parse(raw);
        return {
            best:  Number(p.best)  || 0,
            last:  Number(p.last)  || 0,
            plays: Number(p.plays) || 0,
        };
    } catch {
        return { best: 0, last: 0, plays: 0 };
    }
}

function writeStats(data) {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(data));
    } catch { /* تجاهل */ }
}

function formatStatsLine(stats) {
    if (stats.plays === 0) return "";
    const parts = [`⭐ أعلى نتيجة: ${stats.best}/10`];
    if (stats.plays > 1) parts.push(`آخر نتيجة: ${stats.last}/10`);
    return parts.join(" · ");
}

// ============================================================
// نبض القلب — يُطبّق فقط داخل اللعبة
// ============================================================

const HEART = "💗";

/**
 * يستبدل كل 💗 داخل node بـ <span class="heart-pulse">💗</span>.
 * يُستخدم فقط في اللعبة.
 */
function wrapHeartsIn(node) {
    if (!node) return;

    const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(n) {
                if (!n.nodeValue || !n.nodeValue.includes(HEART)) return NodeFilter.FILTER_REJECT;
                const p = n.parentElement;
                if (!p || p.closest("script, style, textarea, .heart-pulse")) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            },
        }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const n of nodes) {
        const parts = n.nodeValue.split(HEART);
        if (parts.length === 1) continue;

        const frag = document.createDocumentFragment();
        parts.forEach((part, i) => {
            if (part) frag.append(document.createTextNode(part));
            if (i < parts.length - 1) {
                const span = document.createElement("span");
                span.className = "heart-pulse";
                span.textContent = HEART;
                frag.append(span);
            }
        });
        n.replaceWith(frag);
    }
}

/**
 * يكتب نصًا في عقدة، مع لفّ القلوب داخل <span class="heart-pulse">.
 */
function setRichFeedback(node, text, level) {
    if (!node) return;
    node.replaceChildren();

    const parts = String(text).split(HEART);
    parts.forEach((part, i) => {
        if (part) node.append(document.createTextNode(part));
        if (i < parts.length - 1) {
            const span = document.createElement("span");
            span.className = "heart-pulse";
            span.textContent = HEART;
            node.append(span);
        }
    });

    node.dataset.level = level || "";
}

// ============================================================
// الأيقونات
// ============================================================

const HINT_ICON_SVG = `
<svg class="hint-icon" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="1.7"
     stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">
    <path class="hint-bulb"
          d="M9 17h6M10 20h4M12 4a5.5 5.5 0 0 0-3.7 9.5c.7.6.9 1.4.9 2.3h5.6c0-.9.2-1.7.9-2.3A5.5 5.5 0 0 0 12 4Z"/>
    <line class="hint-ray hint-ray-1" x1="12"   y1="1.6" x2="12"   y2="0.4"/>
    <line class="hint-ray hint-ray-2" x1="5.4"  y1="4.6" x2="4.6"  y2="3.8"/>
    <line class="hint-ray hint-ray-3" x1="18.6" y1="4.6" x2="19.4" y2="3.8"/>
    <line class="hint-ray hint-ray-4" x1="3.6"  y1="10"  x2="2.4"  y2="10"/>
    <line class="hint-ray hint-ray-5" x1="20.4" y1="10"  x2="21.6" y2="10"/>
</svg>`;

const ICON_CHECK = `
<svg class="stat-icon" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="3.4"
     stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
</svg>`;

const ICON_FLAME = `
<svg class="stat-icon stat-flame" viewBox="0 0 24 24"
     aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          fill="url(#flameGradient)"
          stroke="#a92f61"
          stroke-width="0.8"
          stroke-linejoin="round"/>
</svg>`;

const ICON_TROPHY = `
<svg class="trophy-icon" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="1.8"
     stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
</svg>`;

// ============================================================
// التهيئة
// ============================================================

export function initQuiz() {
    ui.container = $("#quiz-container");
    ui.startButton = $("#start-quiz");
    ui.result = $("#quiz-result");
    ui.modal = $("#quiz-modal");
    ui.closeBtn = $("#quiz-close");

    if (!ui.container || !ui.startButton || !ui.result || !ui.modal || !ui.closeBtn) {
        console.warn("[quiz] عناصر DOM ناقصة");
        return;
    }

    ui.startButton.addEventListener("click", openAndStart);
    ui.closeBtn.addEventListener("click", closeModal);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !ui.modal.classList.contains("is-hidden")) {
            closeModal();
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (state.timerId === null) return;
        if (document.hidden) pauseTimer();
        else resumeTimer();
    });

    // عرض آخر إحصائيات عند فتح الصفحة
    const stats = readStats();
    if (stats.plays > 0) {
        ui.result.textContent = formatStatsLine(stats);
    }
}

function openModal() {
    ui.modal.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    stopTimer();
    ui.modal.classList.add("is-hidden");
    document.body.style.overflow = "";
    resetState();
}

function openAndStart() {
    openModal();
    start();
}

// ============================================================
// البدء
// ============================================================

function start() {
    resetState();
    state.round = buildRound();

    if (state.round.length === 0) {
        console.error("[quiz] لا أسئلة في الجولة");
        ui.result.textContent = "لا توجد أسئلة متاحة.";
        return;
    }

    ui.result.textContent = "";
    showQuestion();
}

function resetState() {
    stopTimer();
    state.round = [];
    state.index = 0;
    state.score = 0;
    state.streak = 0;
    state.answered = false;
    state.finished = false;
    state.paused = false;
}

function buildRound() {
    return sample(questions, QUIZ.size).map((q) => {
        const wrapped = q.options.map((text, i) => ({
            text,
            correct: i === q.answer,
        }));
        const shuffled = shuffle(wrapped);
        return {
            question: q.question,
            options: shuffled.map((o) => o.text),
            answer: shuffled.findIndex((o) => o.correct),
            explanation: q.explanation || "",
        };
    });
}

// ============================================================
// رأس السؤال
// ============================================================

function buildStatsNode() {
    const wrap = document.createElement("span");
    wrap.className = "quiz-stats";
    wrap.id = "quiz-stats";

    const check = document.createElement("span");
    check.className = "stat-item is-check";
    check.innerHTML = ICON_CHECK;
    check.append(document.createTextNode(String(state.score)));
    wrap.append(check);

    if (state.streak >= 2) {
        const flame = document.createElement("span");
        flame.className = "stat-item is-flame";
        flame.innerHTML = ICON_FLAME;
        flame.append(document.createTextNode(String(state.streak)));
        wrap.append(flame);
    }

    return wrap;
}

function refreshStats() {
    const old = $("#quiz-stats", ui.container);
    if (old) old.replaceWith(buildStatsNode());
}

// ============================================================
// عرض السؤال
// ============================================================

function showQuestion() {
    state.answered = false;

    const current = state.round[state.index];
    const isLast = state.index === state.round.length - 1;
    const progressPercent = ((state.index + 1) / state.round.length) * 100;

    const optionButtons = current.options.map((text, i) =>
        el("button", {
            type: "button",
            class: "quiz-option",
            dataset: { index: String(i) },
            text,
        })
    );

    const restartBtn = el("button", {
        type: "button",
        id: "restart-quiz",
        text: "إعادة الاختبار",
    });

    const nextButton = el("button", {
        type: "button",
        id: "next-question",
        text: isLast ? "عرض النتيجة" : "السؤال التالي",
        disabled: true,
    });

    clear(ui.container);
    ui.container.append(
        el("div", { class: "quiz-progress" }, [
            el("div", {
                class: "quiz-progress-bar",
                style: { width: `${progressPercent}%` },
            }),
        ]),

        el("div", { class: "quiz-timer" }, [
            el("div", { class: "quiz-timer-bar", id: "quiz-timer-bar" }),
        ]),

        el("div", { class: "quiz-header" }, [
            el("span", { class: "quiz-counter", text: `السؤال ${state.index + 1} من ${state.round.length}` }),
            buildStatsNode(),
        ]),

        el("p", { class: "quiz-question", text: current.question }),
        el("div", { id: "quiz-options" }, optionButtons),

        el("div", { class: "quiz-feedback-zone" }, [
            el("p", { id: "answer-feedback", "aria-live": "polite" }),
            el("div", { id: "answer-explanation", hidden: true, class: "hint-card" }),
        ]),

        el("div", { class: "quiz-actions" }, [restartBtn, nextButton])
    );

    optionButtons.forEach((btn, i) => {
        btn.addEventListener("click", () =>
            checkAnswer(i, optionButtons, nextButton)
        );
    });

    restartBtn.addEventListener("click", start);
    nextButton.addEventListener("click", next);

    startTimer();
}

// ============================================================
// الشرح
// ============================================================

function showExplanation(text) {
    const block = $("#answer-explanation", ui.container);
    if (!block) return;

    block.replaceChildren();

    const iconWrap = document.createElement("span");
    iconWrap.className = "hint-icon-wrap";
    iconWrap.innerHTML = HINT_ICON_SVG;

    const textEl = document.createElement("span");
    textEl.className = "hint-text";
    textEl.textContent = text;

    block.append(iconWrap, textEl);
    block.hidden = false;
}

// ============================================================
// المؤقت
// ============================================================

function startTimer() {
    stopTimer();
    state.timeLeft = QUIZ.durationMs;
    state.paused = false;
    state.lastTick = Date.now();

    updateTimerBar();

    state.timerId = setInterval(() => {
        if (state.paused) return;

        const now = Date.now();
        const delta = now - state.lastTick;
        state.lastTick = now;

        state.timeLeft -= delta;

        if (state.timeLeft <= 0) {
            state.timeLeft = 0;
            updateTimerBar();
            handleTimeout();
            return;
        }

        updateTimerBar();
    }, 100);
}

function stopTimer() {
    if (state.timerId !== null) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
}

function pauseTimer() { state.paused = true; }

function resumeTimer() {
    if (state.timerId === null) return;
    state.paused = false;
    state.lastTick = Date.now();
}

function updateTimerBar() {
    const bar = $("#quiz-timer-bar", ui.container);
    if (!bar) return;

    const pct = state.timeLeft / QUIZ.durationMs;
    bar.style.width = `${pct * 100}%`;

    const hue   = 342 - 202 * pct;
    const sat   = 72  - 17  * pct;
    const light = 40  + 32  * pct;
    bar.style.backgroundColor = `hsl(${hue}, ${sat}%, ${light}%)`;

    bar.classList.toggle("is-urgent", pct <= 0.15);
}

// ============================================================
// انتهاء الوقت
// ============================================================

function handleTimeout() {
    if (state.answered || state.finished) return;
    state.answered = true;

    const current = state.round[state.index];
    const optionButtons = ui.container.querySelectorAll(".quiz-option");
    const nextButton = $("#next-question", ui.container);

    state.streak = 0;

    optionButtons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === current.answer) btn.classList.add("is-correct");
    });

    const feedback = $("#answer-feedback", ui.container);
    setRichFeedback(feedback, "انتهى الوقت ⏱️", "error");

    if (current.explanation) showExplanation(current.explanation);

    refreshStats();
    nextButton.disabled = false;
}

// ============================================================
// الإجابة
// ============================================================

function checkAnswer(selectedIndex, optionButtons, nextButton) {
    if (state.answered || state.finished) return;

    stopTimer();
    state.answered = true;

    const current = state.round[state.index];
    const feedback = $("#answer-feedback", ui.container);

    optionButtons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === current.answer) btn.classList.add("is-correct");
        else if (i === selectedIndex) btn.classList.add("is-wrong");
    });

    if (selectedIndex === current.answer) {
        state.score++;
        state.streak++;
        let msg = "إجابة صحيحة 💗";
        if (state.streak >= 2) msg += ` · سلسلة ${state.streak}`;
        setRichFeedback(feedback, msg, "ok");
    } else {
        state.streak = 0;
        setRichFeedback(
            feedback,
            "الإجابة الصحيحة: " + current.options[current.answer],
            "error"
        );
    }

    if (current.explanation) showExplanation(current.explanation);

    refreshStats();
    nextButton.disabled = false;
}

// ============================================================
// الانتقال
// ============================================================

function next() {
    if (!state.answered || state.finished) return;
    state.index++;
    if (state.index < state.round.length) showQuestion();
    else finish();
}

// ============================================================
// رسالة النهاية
// ============================================================

function getEndMessage(score, total) {
    if (score === total) {
        return {
            tier: "perfect",
            title: "درجة كاملة!",
            text: "معلوماتك ممتازة — أنتِ سفيرة الوعي الحقيقية 🎗️",
        };
    }
    if (score >= 8) {
        return {
            tier: "great",
            title: "أداء رائع!",
            text: "معرفتك قوية. شاركيها مع من حولك لتصل الفائدة.",
        };
    }
    if (score >= 4) {
        return {
            tier: "good",
            title: "بداية جيدة!",
            text: "معرفتك أساس يمكن البناء عليه. جرّبي مرة أخرى لتتعلمي أكثر.",
        };
    }
    return {
        tier: "start",
        title: "كل رحلة تبدأ بخطوة 💗",
        text: "لا بأس! المعلومات الجديدة فرصة للتعلم. أعيدي المحاولة 🌸",
    };
}

// ============================================================
// Confetti
// ============================================================

function launchConfetti() {
    const colors = ["#d94f83", "#a92f61", "#ffd93d", "#ff8c42", "#f8c6da", "#e8f5e9"];
    const pieces = 50;

    for (let i = 0; i < pieces; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = `${Math.random() * 100}vw`;
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = `${Math.random() * 1.2}s`;
        piece.style.animationDuration = `${2.4 + Math.random() * 2}s`;
        piece.style.setProperty("--spin", `${(Math.random() * 720 - 360)}deg`);
        piece.style.width = `${6 + Math.random() * 6}px`;
        piece.style.height = `${10 + Math.random() * 8}px`;
        document.body.appendChild(piece);

        setTimeout(() => piece.remove(), 5000);
    }
}

// ============================================================
// النهاية
// ============================================================

async function finish() {
    if (state.finished) return;
    state.finished = true;

    stopTimer();

    const total = state.round.length;
    const message = getEndMessage(state.score, total);

    const restartBtn = el("button", {
        type: "button",
        id: "restart-finish",
        text: "إعادة الاختبار",
        onClick: start,
    });

    const trophyNode = document.createElement("span");
    trophyNode.className = "trophy-wrap";
    trophyNode.innerHTML = ICON_TROPHY;

    clear(ui.container);
    ui.container.append(
        el("div", { class: `quiz-finish is-${message.tier}` }, [
            trophyNode,
            el("h3", { class: "quiz-finish-title", text: message.title }),
            el("p", { class: "quiz-finish-message", text: message.text }),
            el("p", { class: "quiz-finish-score" }, [
                "نتيجتك: ",
                el("strong", { text: `${state.score}/${total}` }),
            ]),
            el("p", {
                id: "quiz-finish-status",
                class: "quiz-finish-status",
                text: "جارٍ تسجيل مشاركتك…",
            }),
            el("div", { class: "quiz-finish-actions" }, [restartBtn]),
        ])
    );

    // نبض القلب في شاشة النهاية (إن وُجد 💗)
    wrapHeartsIn(ui.container);

    if (message.tier === "perfect") {
        launchConfetti();
    }

    try {
        const { error } = await supabase
            .from("quiz_attempts")
            .insert({ score: state.score });

        if (error) throw error;

        await refreshQuizCount();

        // حفظ الإحصائيات المحلية
        const stats = readStats();
        const isNewBest = state.score > stats.best;

        stats.last = state.score;
        if (isNewBest) stats.best = state.score;
        stats.plays += 1;
        writeStats(stats);

        const status = $("#quiz-finish-status", ui.container);
        if (status) {
            status.textContent = isNewBest && stats.plays > 1
                ? "🎉 نتيجة جديدة!"
                : "تم تسجيل مشاركتك 💗";
        }

        ui.result.textContent = formatStatsLine(stats);
    } catch (error) {
        console.error("[quiz] فشل تسجيل المحاولة:", error);
        const status = $("#quiz-finish-status", ui.container);
        if (status) status.textContent = "تعذر التسجيل. حاولي لاحقًا.";
        ui.result.textContent = `آخر نتيجة: ${state.score} من ${total}`;
    }
}