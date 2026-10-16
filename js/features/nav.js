/**
 * nav.js — تفعيل الرابط النشط فقط.
 * التنقل أفقي دائم، بلا زر قائمة.
 */

export function initNav(currentPage) {
    document.querySelectorAll("[data-nav]").forEach((link) => {
        if (link.dataset.nav === currentPage) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
        }
    });
}