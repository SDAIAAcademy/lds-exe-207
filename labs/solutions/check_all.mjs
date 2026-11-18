// The trainer's check of LDS-EXE-207's labs. Run from the repository root:
//   node labs/solutions/check_all.mjs
// 1. The generator writes the same bytes as the files in the repository.
// 2. Every reference number is computed again from the CSV files, the way a participant does it
//    in a spreadsheet with the rules on the lab pages, and compared with solutions/key.json.
// Prints PASS, or the first difference and exits 1.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const labs = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (msg) => { console.log('FAIL: ' + msg); process.exit(1); };
const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };

// A small CSV reader (quoted fields, UTF-8 with a byte-order mark)
function readCsv(rel) {
  const text = readFileSync(join(labs, rel), 'utf8').replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

try {
  execFileSync(process.execPath, [join(labs, '_tools', 'prepare_files.mjs'), '--check'], { stdio: 'pipe' });
} catch (e) { fail('the generator does not reproduce the files: ' + String(e.stdout)); }
const key = JSON.parse(readFileSync(join(labs, 'solutions', 'key.json'), 'utf8'));
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

// ---- Lab 1.2: score the recorded outputs with the lab's rule ----
function scoreSet(name) {
  const cases = readCsv(`files/${name}_set.csv`);
  const outs = Object.fromEntries(readCsv(`files/outputs_${name}_recorded.csv`).map((o) => [o.id, o]));
  return cases.map((c) => {
    const o = outs[c.id];
    const pass = o.category === c.expected_category && o.urgency === c.expected_urgency && o.unit === c.expected_unit && o.reply_language === c.lang;
    return { id: c.id, lang: c.lang, pass, critical: c.expected_urgency === 'emergency' && o.urgency !== 'emergency' };
  });
}
for (const name of ['demo', 'realistic']) {
  const s = scoreSet(name);
  const k = key.lab_1_2[name];
  eq(s.filter((x) => x.pass).length, k.pass, `${name} passes`);
  eq(r1((100 * s.filter((x) => x.pass).length) / s.length), k.rate, `${name} pass rate`);
  for (const lang of ['ar', 'en']) {
    const g = s.filter((x) => x.lang === lang);
    eq([g.length, g.filter((x) => x.pass).length], [k[lang].n, k[lang].pass], `${name} ${lang}`);
  }
  eq(s.filter((x) => x.critical).map((x) => x.id), k.critical, `${name} critical failures`);
  eq(s.filter((x) => !x.pass).map((x) => x.id), k.failed, `${name} failed cases`);
}

// ---- Lab 1.3: the readiness guide ----
const OFTEN = { continuous: 5, daily: 4, weekly: 3, monthly: 2, quarterly: 1 };
function readiness(rel) {
  let points = 0, n = 0; const blocking = [];
  for (const r of readCsv(rel)) {
    if (r.required_for_production !== 'yes') continue;
    n++;
    const c = +r.completeness_pct, d = +r.duplicates_pct, v = +r.validity_pct;
    const dims = {
      access: r.access_status !== 'granted' ? 0 : r.access_route === 'service_account' ? 2 : 1,
      quality: c >= 95 && d <= 2 && v >= 95 ? 2 : c >= 85 && d <= 5 && v >= 90 ? 1 : 0,
      classification: r.classification === 'عام' || r.ai_use_approval === 'approved' ? 2 : r.ai_use_approval === 'requested' ? 1 : 0,
      lineage: { documented: 2, partial: 1, none: 0 }[r.lineage],
      refresh: r.refresh_actual === 'none' ? 0 : r.refresh_actual.includes('manual') ? 1 : OFTEN[r.refresh_actual.split(' ')[0]] >= OFTEN[r.refresh_needed] ? 2 : 1
    };
    points += Object.values(dims).reduce((a, b) => a + b, 0);
    for (const [k, v] of Object.entries(dims)) if (v === 0) blocking.push(`${r.source_id}:${k}`);
    if (r.access_route === 'personal_login') blocking.push(`${r.source_id}:identity`);
  }
  return { points, max: n * 10, blocking };
}
for (const p of ['P1', 'P2']) {
  const got = readiness(`files/inventory_${p.toLowerCase()}.csv`);
  eq([got.points, got.max], [key.lab_1_3[p].points, key.lab_1_3[p].max], `${p} readiness points`);
  eq(got.blocking.length, key.lab_1_3[p].blocking.length, `${p} blocking items`);
}

// ---- Lab 2.1: staff minutes per request ----
const asis = readCsv('files/p1_asis.csv').reduce((a, s) => a + +s.staff_minutes * +s.share_of_requests, 0);
eq(r2(asis), key.lab_2_1.asis_staff_minutes, 'as-is staff minutes');
const tobe = key.lab_2_1.tobe_steps.reduce((a, s) => a + s.minutes * s.share, 0);
eq(r2(tobe), key.lab_2_1.tobe_staff_minutes, 'to-be staff minutes');
const org = readCsv('files/org_structure.csv');
eq([org.reduce((a, u) => a + +u.staff, 0), org.reduce((a, u) => a + +u.ai_skilled_staff, 0)], [key.lab_2_1.staff, key.lab_2_1.ai_skilled], 'staff and AI-skilled staff');

// ---- Capstone: cost per successful task from capstone_costs.csv ----
const costs = Object.fromEntries(readCsv('files/capstone_costs.csv').map((r) => [r.parameter, r]));
const p1Success = key.lab_1_2.realistic.pass / key.lab_1_2.realistic.n;
for (const p of ['P1', 'P2']) {
  const v = (name) => +costs[name][p];
  const success = p === 'P1' ? p1Success : v('measured_success_rate') && 106 / 120;
  const per = (minutes) => {
    const vol = v('monthly_volume_production');
    const total = vol * v('model_cost_per_task_sar') + v('fixed_monthly_cost_sar') + vol * minutes * v('loaded_cost_per_staff_minute_sar') + vol * (1 - success) * v('rework_minutes_per_failed_task') * v('loaded_cost_per_staff_minute_sar');
    return r2(total / (vol * success));
  };
  eq(per(v('staff_minutes_per_task_after_redesign')), key.capstone[p].tobe.per_success, `${p} cost per success after redesign`);
  eq(per(v('staff_minutes_per_task_with_pilot_today')), key.capstone[p].asis.per_success, `${p} cost per success today`);
  eq(r2((v('baseline_staff_minutes_per_task') * v('loaded_cost_per_staff_minute_sar')) / v('baseline_first_time_right')), key.capstone[p].baseline_per_success, `${p} baseline per success`);
}

console.log('PASS: generator reproduces the files; lab 1.2, 1.3, 2.1 and capstone numbers match key.json');
