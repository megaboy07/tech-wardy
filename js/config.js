/**
 * config.js — ثوابت الموقع العامة.
 */

export const APP = {
    name: "تِك وردي",
    nameEn: "TECH WARDI",
    version: "0.3.0",
    // ISO 8601 بتوقيت السودان (UTC+2)
    eventDate: "2026-10-20T10:00:00+02:00",
};

// المفتاح publishable مُخصَّص للنشر العلني؛ الحماية الفعلية من RLS في Supabase.
export const SUPABASE = {
    url: "https://cpasmtfafirifugkijvw.supabase.co",
    publishableKey: "sb_publishable_iDtwCMg0rA2oNLMdmgQkIg_LamoTVXQ",
};

export const QUIZ = {
    size: 10,
    durationMs: 30_000,   // 30 ثانية
    basePoints: 10,
    speedBonusMax: 10,
    streakThreshold: 3,
    streakBonus: 5,
};



export const MESSAGES = {
    maxLength: 500,
    fetchLimit: 50,
    refreshIntervalMs: 30_000,
};