/**
 * dom.js — أدوات DOM صغيرة.
 */

export const $ = (selector, root = document) =>
    root.querySelector(selector);

export function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined || value === false) continue;

        if (key === "class" || key === "className") {
            node.className = value;
        } else if (key === "text") {
            node.textContent = String(value);
        } else if (key === "dataset" && typeof value === "object") {
            Object.assign(node.dataset, value);
        } else if (key === "style" && typeof value === "object") {
            Object.assign(node.style, value);
        } else if (key.startsWith("on") && typeof value === "function") {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            node.setAttribute(key, value);
        }
    }

    const list = Array.isArray(children) ? children : [children];
    for (const child of list) {
        if (child === null || child === undefined || child === false) continue;
        node.append(child);
    }

    return node;
}

export function clear(node) {
    node.replaceChildren();
}

export function setText(node, text) {
    node.textContent = String(text);
}