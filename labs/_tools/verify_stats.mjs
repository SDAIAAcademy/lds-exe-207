// Computes every number that LDS-EXE-207 states on slides, in the bank and in the README:
// the parallel examples (HR staff-questions assistant, Development site-photo pilot, a parallel
// process, parallel gates) and intervals on the case's own results. Run:
//   node labs/_tools/verify_stats.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const key = JSON.parse(readFileSync(join(here, '..', 'solutions', 'key.json'), 'utf8'));
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const pct = (a, b) => r1((100 * a) / b);
const out = {};

// Wilson score interval, 95% (z = 1.959964)
function wilson(k, n, z = 1.959964) {
  const p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return [r1(100 * (c - h)), r1(100 * (c + h))];
}

// --- Session 2 parallel: HR staff-questions assistant ---
const hr = { demo: [19, 20], real: [28, 40], ar: [15, 24], en: [13, 16], critical: 1, sensitive: 4 };
out.hr = {
  demo_pct: pct(...hr.demo), real_pct: pct(...hr.real), ar_pct: pct(...hr.ar), en_pct: pct(...hr.en),
  gap_points: r1(pct(...hr.en) - pct(...hr.ar)),
  check_total: hr.ar[0] + hr.en[0] === hr.real[0] && hr.ar[1] + hr.en[1] === hr.real[1],
  wilson_real: wilson(...hr.real), wilson_demo: wilson(...hr.demo)
};

// --- Case results, intervals (for the debrief notes) ---
const R = key.lab_1_2.realistic, D = key.lab_1_2.demo;
out.case = { demo_wilson: wilson(D.pass, D.n), real_wilson: wilson(R.pass, R.n), ar_wilson: wilson(R.ar.pass, R.ar.n), en_wilson: wilson(R.en.pass, R.en.n) };

// --- Session 3 parallel: Development's site-photo progress pilot, three sources ---
const site = {
  photos: { access: 2, quality: 1, classification: 2, lineage: 1, refresh: 1 },
  schedule: { access: 1, quality: 2, classification: 1, lineage: 2, refresh: 2, personal_login: true },
  reports: { access: 0, quality: 1, classification: 0, lineage: 0, refresh: 1 }
};
let pts = 0, blocking = 0;
for (const s of Object.values(site)) {
  for (const [k, v] of Object.entries(s)) { if (k === 'personal_login') continue; pts += v; if (v === 0) blocking++; }
  if (s.personal_login) blocking++;
}
out.site = { points: pts, max: 30, pct: pct(pts, 30), blocking };

// --- Session 3 parallel: run cost at volume, HR assistant ---
const fixed = 6000, perAnswer = 0.05;
out.volume = { pilot_300: r2((fixed + 300 * perAnswer) / 300), prod_6000: r2((fixed + 6000 * perAnswer) / 6000) };

// --- Day 2 S1 parallel: supplier-invoice process in a fictional logistics company ---
const asis = [1.5, 2.0, 2.5, 1.0, 3.0]; // minutes per invoice, five steps, four of them workarounds
const tobe = [[0.5, 1], [3.0, 0.12], [0.5, 1]]; // [minutes, share]
out.invoice = { asis: r2(asis.reduce((a, b) => a + b, 0)), tobe: r2(tobe.reduce((a, [m, s]) => a + m * s, 0)) };

// --- Day 2 S2 parallel gates: HR assistant at scale ---
const hrCost = { volume: 6000, wage: 1.2, baseline_min: 6, baseline_ftr: 0.9, model: 0.05, fixed: 6000, review_min: 0.5, rework_min: 5 };
function perSuccess(c, success) {
  const total = c.volume * c.model + c.fixed + c.volume * c.review_min * c.wage + c.volume * (1 - success) * c.rework_min * c.wage;
  return r2(total / (c.volume * success));
}
out.hr_cost = { baseline_per_success: r2((hrCost.baseline_min * hrCost.wage) / hrCost.baseline_ftr), at_70: perSuccess(hrCost, 0.7), at_88: perSuccess(hrCost, 0.88) };

// --- RMF: likelihood x impact levels (for the parallel risk example) ---
const level = (s) => (s <= 2 ? 'low' : s <= 6 ? 'medium' : s <= 12 ? 'high' : 'catastrophic');
out.rmf = { '3x3': [9, level(9)], '3x2': [6, level(6)], '1x2': [2, level(2)], '4x4': [16, level(16)] };

// --- Practice bank parallels ---
const hd = { demo: [24, 25], real: [33, 50], ar: [15, 30], en: [18, 20] };
out.bank_helpdesk = { demo_pct: pct(...hd.demo), real_pct: pct(...hd.real), ar_pct: pct(...hd.ar), en_pct: pct(...hd.en),
  check_total: hd.ar[0] + hd.en[0] === hd.real[0] && hd.ar[1] + hd.en[1] === hd.real[1], pooled: [hd.demo[0] + hd.real[0], hd.demo[1] + hd.real[1], pct(hd.demo[0] + hd.real[0], hd.demo[1] + hd.real[1])] };
out.bank_hr_pooled = [hr.demo[0] + hr.real[0], hr.demo[1] + hr.real[1], pct(hr.demo[0] + hr.real[0], hr.demo[1] + hr.real[1])];
out.bank_volume = { at_200: r2((4000 + 200 * 0.1) / 200), at_5000: r2((4000 + 5000 * 0.1) / 5000) };
const q = (c, d, v) => (c >= 95 && d <= 2 && v >= 95 ? 2 : c >= 85 && d <= 5 && v >= 90 ? 1 : 0);
out.bank_quality = q(93, 3, 96);
out.bank_rmf = [2 * 4, level(2 * 4)];
// Day 2 review checkpoint (commercial leasing assistant) and the parallel stop-rule threshold
out.review_day1 = { demo: pct(23, 25), real: pct(31, 45) };

console.log(JSON.stringify(out, null, 2));
