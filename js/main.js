/**
 * main.js — نقطة الدخول الوحيدة.
 */

import { APP } from "./config.js";
import { initNav } from "./features/nav.js";

const PAGE = document.body.dataset.page || "home";

const pageLoaders = {
    home: async () => {
        const { initCountdown } = await import("./features/countdown.js");
        const { initCounters } = await import("./features/impact-counters.js");
        const { initShare } = await import("./features/share.js");
        initCountdown();
        initCounters();
        initShare();
    },
    quiz: async () => {
        const { initQuiz } = await import("./features/quiz.js");
        initQuiz();
    },
    wall: async () => {
        const { initHopeWall } = await import("./features/hope-wall.js");
        initHopeWall();
    },
    learn: async () => {},
    videos: async () => {},
    "404": async () => {},
};

function setFooterYear() {
    const node = document.getElementById("footer-year");
    if (node) node.textContent = `© ${new Date().getFullYear()} ${APP.name}`;
}

async function boot() {
    initNav(PAGE);
    setFooterYear();

    const loader = pageLoaders[PAGE];
    if (!loader) return;

    try {
        await loader();
    } catch (error) {
        console.error(`[main] فشل تحميل ميزات "${PAGE}":`, error);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}

window.addEventListener("error", (event) => {
    console.error("[خطأ غير معالَج]", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
    console.error("[وعد مرفوض]", event.reason);
});