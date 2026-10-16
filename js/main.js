/**
 * main.js — نقطة الدخول الوحيدة.
 * يقرأ data-page من <body> ويحمّل الميزات المناسبة فقط.
 */

import { APP, FEATURES } from "./config.js";
import { initNav } from "./features/nav.js";

const TAG = "[techwardi]";
const PAGE = document.body.dataset.page || "home";

// كل صفحة تُحمّل ما تحتاجه — لا شيء زائد
const pageLoaders = {
    home: async () => {
        if (FEATURES.countdown) {
            const { initCountdown } = await import("./features/countdown.js");
            initCountdown();
        }
        if (FEATURES.counters) {
            const { initCounters } = await import("./features/impact-counters.js");
            initCounters();
        }
        if (FEATURES.share) {
            const { initShare } = await import("./features/share.js");
            initShare();
        }
    },

    quiz: async () => {
        if (!FEATURES.quiz) return;
        const { initQuiz } = await import("./features/quiz.js");
        initQuiz();
    },

    wall: async () => {
        if (!FEATURES.hopeWall) return;
        const { initHopeWall } = await import("./features/hope-wall.js");
        initHopeWall();
    },

    learn: async () => { /* لا ميزات ديناميكية */ },
    videos: async () => { /* لا ميزات ديناميكية */ },
    "404": async () => { /* لا شيء */ },
};

function setFooterYear() {
    const el = document.getElementById("footer-year");
    if (!el) return;
    el.textContent = `© ${new Date().getFullYear()} ${APP.name}`;
}

async function boot() {
    console.info(`${TAG} v${APP.version} — الصفحة: ${PAGE}`);

    initNav(PAGE);
    setFooterYear();

    const loader = pageLoaders[PAGE];
    if (loader) {
        try {
            await loader();
        } catch (error) {
            console.error(`${TAG} فشل تحميل ميزات "${PAGE}":`, error);
        }
    }

    console.info(`${TAG} جاهز`);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}

window.addEventListener("error", (event) => {
    console.error(`${TAG} [خطأ غير معالَج]`, event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
    console.error(`${TAG} [وعد مرفوض]`, event.reason);
});