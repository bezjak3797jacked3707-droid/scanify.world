// Server-side inappropriate-name filter. Do NOT import this in a "use client" file,
// so the word list never ships to the browser.
//
// Layers:
//   1. format rules (lib/displayName.ts)
//   2. reserved / impersonation names
//   3. word list that sees through spacing, repeated letters, accents and 1337-speak
//   4. OpenAI moderation (multilingual) in app/api/set-display-name/route.ts

import { checkDisplayNameFormat, NAME_NOT_ALLOWED, type NameCheck } from "./displayName";

// Matched anywhere inside the name (after removing spaces/symbols). Only words that
// almost never appear inside innocent words belong here.
const SUBSTRING_WORDS = [
  // English
  "fuck", "fvck", "phuck", "shit", "cunt", "nigger", "nigga", "faggot", "bitch", "whore",
  "slut", "bastard", "asshole", "arsehole", "dickhead", "cocksucker", "pussy", "wanker",
  "blowjob", "handjob", "cumshot", "dildo", "penis", "vagina", "titties", "tranny",
  "retard", "pedophile", "paedophile", "molest", "incest", "killyourself", "hitler",
  "whitepower", "siegheil",
  // Swedish
  "knulla", "fitta", "javla",
  // German / Spanish / French
  "scheisse", "arschloch", "hurensohn", "fotze", "wichser", "mierda", "pendejo", "cabron",
  "salope", "connard", "encule", "putain",
];

// Matched only as a whole word (so "class", "mass", "Hancock", "Nazir" are fine).
const TOKEN_WORDS = [
  "ass", "arse", "sex", "sexy", "dick", "cock", "tit", "tits", "boob", "boobs", "porn",
  "porno", "anal", "cum", "cumming", "rape", "rapes", "rapist", "nazi", "nazis", "kike",
  "chink", "spic", "gook", "coon", "paki", "pedo", "kys", "kkk", "fag", "fags", "dyke",
  "milf", "xxx", "nude", "nudes", "naked", "wank", "twat", "fuk", "fck", "neger", "kuk",
  "hora", "puto", "puta", "pute",
];

// Names that could be mistaken for the team or the system.
const RESERVED_CONTAINS = ["scanify", "admin", "moderator"];
const RESERVED_EXACT = new Set([
  "anonymous", "support", "staff", "official", "owner", "system", "root", "null",
  "undefined", "user", "guest", "mod",
]);

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
};

// Every letter may repeat ("fuuuck", "assss"): "ass" becomes /a+s+s+/ (so "as" still passes).
function loose(word: string, anchored: boolean): RegExp {
  const body = word.split("").map((c) => `${c}+`).join("");
  return new RegExp(anchored ? `^${body}$` : body);
}

const SUBSTRING_RES = SUBSTRING_WORDS.map((w) => loose(w, false));
const TOKEN_RES = TOKEN_WORDS.map((w) => loose(w, true));

function prepare(name: string): { tokens: string[]; compact: string } {
  const base = name
    // "BigAss" -> "Big Ass"
    .replace(/([a-z\u00DF-\u00F6\u00F8-\u00FF])([A-Z\u00C0-\u00D6\u00D8-\u00DE])/g, "$1 $2")
    .replace(/\u00DF/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents: å -> a, ö -> o
    .toLowerCase()
    .replace(/[01345678]/g, (d) => LEET[d]);

  return {
    tokens: base.split(/[^a-z]+/).filter(Boolean),
    compact: base.replace(/[^a-z]/g, ""),
  };
}

export function checkDisplayName(raw: unknown): NameCheck {
  const format = checkDisplayNameFormat(raw);
  if (!format.ok) return format;

  const { tokens, compact } = prepare(format.name);

  if (RESERVED_EXACT.has(compact) || RESERVED_CONTAINS.some((w) => compact.includes(w))) {
    return { ok: false, reason: "That name is reserved. Please choose another." };
  }

  if (
    SUBSTRING_RES.some((r) => r.test(compact)) ||
    tokens.some((t) => TOKEN_RES.some((r) => r.test(t)))
  ) {
    return { ok: false, reason: NAME_NOT_ALLOWED };
  }

  return format;
}