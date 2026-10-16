/**
 * nav.js — تفعيل القائمة + الرابط النشط + قائمة الجوال.
 */

import { $ } from "../core/dom.js";

const TAG = "[techwardi:nav]";

export function initNav(currentPage) {
    activateCurrent(currentPage);
    wireMenuToggle();

    console.info(`${TAG} جاهزة — ${currentPage}`);
}

function activateCurrent(page) {
    document.querySelectorAll("[data-nav]").forEach((link) => {
        if (link.dataset.nav === page) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
        }
    });
}

function wireMenuToggle() {
    const toggle = $(".menu-toggle");
    const nav = $("#main-navigation");

    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        nav.classList.toggle("is-open", !expanded);
    });

    // إغلاق القائمة عند اختيار رابط
    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            toggle.setAttribute("aria-expanded", "false");
            nav.classList.remove("is-open");
        });
    });
}
