// Writes every synthetic file of LDS-EXE-207 into labs/files/ and the trainer's reference numbers
// into labs/solutions/key.json. No randomness: the content is written out below, so every run
// gives the same bytes. Run from the repository root: node labs/_tools/prepare_files.mjs
// With --check it writes nothing and exits 1 if any file on disk differs from what it would write.
//
// Everything here is invented for the course: the company Radhah, its people, pilots, messages,
// inventories and costs. The recorded outputs of the maintenance-request pilot (P1) are designed
// by the course to show the failure patterns the lab teaches; they were not produced by a model.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const labs = join(here, '..');
const CHECK = process.argv.includes('--check');

const out = new Map();
const BOM = '﻿';
function csv(rows) {
  const esc = (v) => {
    const s = typeof v === 'number' ? String(v) : String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return BOM + rows.map((r) => r.map(esc).join(',')).join('\n') + '\n';
}
const put = (rel, text) => out.set(rel, text);
const r2 = (x) => Math.round(x * 100) / 100;
const r1 = (x) => Math.round(x * 10) / 10;
const pct = (a, b) => r1((100 * a) / b);

// ======================================================================================
// Lab 1.2: the maintenance-request triage pilot (P1)
// ======================================================================================

export const CATEGORIES = ['plumbing', 'electrical', 'ac', 'lift', 'gas', 'pest', 'carpentry', 'appliance', 'general'];
export const URGENCIES = ['emergency', 'urgent', 'routine'];
const CAT_AR = { plumbing: 'سباكة', electrical: 'كهرباء', ac: 'تكييف', lift: 'مصاعد', gas: 'غاز', pest: 'مكافحة حشرات', carpentry: 'نجارة وأقفال', appliance: 'أجهزة مرفقة', general: 'عام' };
const URG_AR = { emergency: 'طارئ', urgent: 'عاجل', routine: 'اعتيادي' };

// [id, lang, message, expected category, expected urgency, expected unit]
// The vendor's demonstration set: short, clean, one issue, the unit always stated.
const DEMO = [
  ['D01', 'ar', 'يوجد تسرب ماء من خلاط المطبخ. الشقة 0402 في المبنى B03.', 'plumbing', 'routine', 'B03-0402'],
  ['D02', 'en', 'The air conditioner in the master bedroom is not cooling. Unit B05-0701.', 'ac', 'urgent', 'B05-0701'],
  ['D03', 'ar', 'المكيف في الصالة لا يبرد. الشقة 0910 في المبنى B08.', 'ac', 'urgent', 'B08-0910'],
  ['D04', 'en', "Please send someone to repaint the children's room. Unit B02-0305.", 'general', 'routine', 'B02-0305'],
  ['D05', 'en', 'I smell gas in the kitchen. Unit B06-0204.', 'gas', 'emergency', 'B06-0204'],
  ['D06', 'ar', 'المصعد في المبنى B11 متوقف منذ الصباح. أسكن في الشقة 1203.', 'lift', 'urgent', 'B11-1203'],
  ['D07', 'en', 'There are cockroaches in the bathroom. Unit B09-0102.', 'pest', 'routine', 'B09-0102'],
  ['D08', 'ar', 'قفل الباب الرئيسي لا يعمل ولا أستطيع إقفال الشقة. الشقة 0601 في المبنى B04.', 'carpentry', 'urgent', 'B04-0601'],
  ['D09', 'en', 'No hot water in the apartment since this morning. Unit B10-0508.', 'plumbing', 'urgent', 'B10-0508'],
  ['D10', 'ar', 'غسالة الصحون المرفقة بالشقة لا تعمل. الشقة 0303 في المبنى B07.', 'appliance', 'routine', 'B07-0303'],
  ['D11', 'en', 'The bedroom door is hard to close and squeaks. Unit B07-0101.', 'carpentry', 'routine', 'B07-0101'],
  ['D12', 'ar', 'يخرج شرر من مقبس الكهرباء في غرفة النوم. الشقة 0805 في المبنى B12.', 'electrical', 'emergency', 'B12-0805'],
  ['D13', 'en', 'The smoke detector in the hallway keeps beeping. Unit B01-1102.', 'electrical', 'routine', 'B01-1102'],
  ['D14', 'ar', 'انقطعت الكهرباء عن غرفتين في الشقة. الشقة 0207 في المبنى B09.', 'electrical', 'urgent', 'B09-0207'],
  ['D15', 'en', 'The kitchen sink drains very slowly. Unit B04-0909.', 'plumbing', 'routine', 'B04-0909'],
  ['D16', 'ar', 'يوجد نمل في المطبخ. الشقة 1005 في المبنى B02.', 'pest', 'routine', 'B02-1005']
];

// Thirty realistic messages, as tenants write them: dialect, voice-note transcripts, two issues
// in one message, no unit number, Arabic and English mixed, Arabic in Latin letters, complaints.
// [id, lang, channel, message, expected category, expected urgency, expected unit, feature]
const REAL = [
  ['R01', 'ar', 'app', 'السلام عليكم، المكيف في غرفة النوم لا يبرد منذ أمس. الشقة 0507 في المبنى B03.', 'ac', 'urgent', 'B03-0507', 'clean'],
  ['R02', 'ar', 'messaging', 'فيه ريحة قوية طالعة من عند الفرن من الصبح والعيال دايخين، عمارة 7 شقة 12', 'gas', 'emergency', 'B07-0012', 'dialect'],
  ['R03', 'en', 'app', 'Hi, the kitchen tap is leaking slowly. Unit B05-0210.', 'plumbing', 'routine', 'B05-0210', 'clean'],
  ['R04', 'ar', 'voice', 'السلام عليكم معك ابو فهد من عمارة تسعة الدور الثالث يعني الشقة ثلاثمية واربعة الحين الكهربا طافية بنص البيت والثلاجة فيها اكل', 'electrical', 'urgent', 'B09-0304', 'voice'],
  ['R05', 'en', 'messaging', 'lift not working since morning my mother is old she cannot use stairs building 14', 'lift', 'urgent', 'missing', 'no-unit'],
  ['R06', 'ar', 'app', 'فيه تسريب بسيط تحت المغسلة، والأهم إن الباب الرئيسي ما يتقفل أبد واحنا مسافرين بكرة. شقة 1102 عمارة 1', 'carpentry', 'urgent', 'B01-1102', 'two-issues'],
  ['R07', 'en', 'app', 'AC making a loud noise but still cooling. B08-0601', 'ac', 'routine', 'B08-0601', 'clean'],
  ['R08', 'ar', 'messaging', 'المكيف يهرّب موية على الجدار والموية صارت تنقط على فيش الكهربا', 'electrical', 'emergency', 'missing', 'dialect'],
  ['R09', 'en', 'app', "Water is pouring from the ceiling in the living room, it's flooding. Unit B02-0903. Please hurry!", 'plumbing', 'emergency', 'B02-0903', 'clean'],
  ['R10', 'ar', 'app', 'نرجو إرسال فني لطلاء جدار غرفة الأطفال. الشقة 0105 في المبنى B04.', 'general', 'routine', 'B04-0105', 'clean'],
  ['R11', 'ar', 'messaging', 'الـ AC ما يشتغل نهائي والـ thermostat طافي، unit B06-0402', 'ac', 'urgent', 'B06-0402', 'mixed'],
  ['R12', 'en', 'messaging', "There's a person stuck in the lift in building 11, between floors 4 and 5!!", 'lift', 'emergency', 'missing', 'no-unit'],
  ['R13', 'ar', 'messaging', 'الصراصير مالية المطبخ، ممكن أحد يجي يرش؟ شقة 208 عمارة 15', 'pest', 'routine', 'B15-0208', 'dialect'],
  ['R14', 'ar', 'app', 'الماء الساخن لا يعمل في الشقة منذ يومين.', 'plumbing', 'urgent', 'missing', 'no-unit'],
  ['R15', 'en', 'app', 'The dishwasher that came with the flat stopped draining. B10-0711', 'appliance', 'routine', 'B10-0711', 'clean'],
  ['R16', 'ar', 'voice', 'يا اخوان الفيش اللي بالصالة يطلع شرار وريحة حريق ابي احد يجي ضروري عمارة اثنعش شقة خمسمية وسبعة', 'electrical', 'emergency', 'B12-0507', 'voice'],
  ['R17', 'en', 'app', "Front door lock is jammed, I can't lock it from inside. Unit B07-0302", 'carpentry', 'urgent', 'B07-0302', 'clean'],
  ['R18', 'ar', 'app', 'نافذة غرفة النوم لا تُغلق جيدًا ويدخل الغبار. الشقة 0806 في المبنى B05.', 'carpentry', 'routine', 'B05-0806', 'clean'],
  ['R19', 'ar', 'messaging', 'السيفون خربان والموية ما توقف تمشي بالحمام، شقة 403 عمارة 2', 'plumbing', 'routine', 'B02-0403', 'dialect'],
  ['R20', 'en', 'messaging', "Third time asking!!! Nobody came to fix the AC and it's 45 degrees. B03-1004", 'ac', 'urgent', 'B03-1004', 'complaint'],
  ['R21', 'ar', 'messaging', 'el mukayef ma yebared, shaqa 5 3emara 16', 'ac', 'urgent', 'B16-0005', 'arabizi'],
  ['R22', 'en', 'app', 'Can someone check the smoke detector beeping in the hallway? B09-0106', 'electrical', 'routine', 'B09-0106', 'clean'],
  ['R23', 'ar', 'app', 'نشكركم على سرعة إصلاح المصعد أمس. ونود الإبلاغ عن تشقق صغير في بلاط الشرفة. الشقة 0703 في المبنى B11.', 'general', 'routine', 'B11-0703', 'two-issues'],
  ['R24', 'en', 'app', 'Toilet blocked, and it is the only bathroom in the apartment. B12-0202', 'plumbing', 'urgent', 'B12-0202', 'clean'],
  ['R25', 'ar', 'messaging', 'الباب الخارجي حق العمارة خربان وأي أحد يدخل، عمارة 4', 'carpentry', 'urgent', 'missing', 'no-unit'],
  ['R26', 'en', 'app', 'Ants in the kitchen. Not urgent. B01-0909', 'pest', 'routine', 'B01-0909', 'clean'],
  ['R27', 'ar', 'app', 'المكيف لا يعمل في الصالة، كما توجد بقعة رطوبة في السقف. الشقة 1201 في المبنى B08.', 'ac', 'urgent', 'B08-1201', 'two-issues'],
  ['R28', 'ar', 'voice', 'الو السلام عليكم انا ساكنة في شقة مية وواحد عمارة ستة الموية الحارة ما تطلع من يوم السبت', 'plumbing', 'urgent', 'B06-0101', 'voice'],
  ['R29', 'en', 'app', 'The washing machine provided with the unit leaks water onto the floor every wash. B04-0808', 'appliance', 'routine', 'B04-0808', 'clean'],
  ['R30', 'ar', 'messaging', 'ودي أعرف متى موعد تجديد العقد؟ وبعد الدش ما يطلع موية زين، شقة 305 عمارة 10', 'plumbing', 'routine', 'B10-0305', 'two-issues']
];

// The recorded outputs: identical to the expected fields except where listed here.
// [category, urgency, unit, reply language]
const DEMO_DIFF = { D11: { category: 'general' } };
const REAL_DIFF = {
  R02: { category: 'appliance', urgency: 'routine' },
  R04: { unit: 'B03-0304' },
  R05: { unit: 'B14-0001' },
  R06: { category: 'plumbing', urgency: 'routine' },
  R08: { category: 'ac', urgency: 'routine' },
  R11: { reply_language: 'en' },
  R14: { unit: 'B01-0101' },
  R16: { unit: 'B02-0507' },
  R20: { category: 'general', urgency: 'routine' },
  R21: { category: 'general', urgency: 'routine', unit: 'missing', reply_language: 'en' },
  R23: { category: 'lift' },
  R30: { category: 'general' }
};

function reply(cat, urg, unit, lang) {
  if (lang === 'ar') {
    const ask = unit === 'missing' ? ' فضلًا اكتب رقم المبنى ورقم الشقة.' : '';
    return `شكرًا لتواصلك. سجّلنا طلبك (${CAT_AR[cat]}، ${URG_AR[urg]}).${ask}`;
  }
  const ask = unit === 'missing' ? ' Please send your building and unit number.' : '';
  return `Thank you. Your request is logged (${cat}, ${urg}).${ask}`;
}

const RECORDED_NOTE = 'recorded: course-designed stand-in, not a model';
function outputs(cases, diff, isReal) {
  return cases.map((c) => {
    const [id, lang] = c;
    const [cat, urg, unit] = isReal ? [c[4], c[5], c[6]] : [c[3], c[4], c[5]];
    const d = diff[id] || {};
    const o = { id, category: d.category ?? cat, urgency: d.urgency ?? urg, unit: d.unit ?? unit, reply_language: d.reply_language ?? lang };
    o.reply = reply(o.category, o.urgency, o.unit, o.reply_language);
    return o;
  });
}
const demoOut = outputs(DEMO, DEMO_DIFF, false);
const realOut = outputs(REAL, REAL_DIFF, true);

// Scoring by the course's stated rule: a case passes when the category, the urgency, the unit
// (or "missing" when the message gives none) and the reply language all match. A critical
// failure is an expected emergency that the output does not mark emergency.
function score(cases, outs, isReal) {
  return cases.map((c, i) => {
    const o = outs[i];
    const [id, lang] = c;
    const [cat, urg, unit] = isReal ? [c[4], c[5], c[6]] : [c[3], c[4], c[5]];
    const ok = { category: o.category === cat, urgency: o.urgency === urg, unit: o.unit === unit, lang: o.reply_language === lang };
    const pass = ok.category && ok.urgency && ok.unit && ok.lang;
    const critical = urg === 'emergency' && o.urgency !== 'emergency';
    const unitInvented = unit === 'missing' && o.unit !== 'missing';
    return { id, lang, ok, pass, critical, unitInvented, feature: isReal ? c[7] : 'clean' };
  });
}
const demoScore = score(DEMO, demoOut, false);
const realScore = score(REAL, realOut, true);

function summary(sc) {
  const n = sc.length, p = sc.filter((s) => s.pass).length;
  const by = (lang) => { const g = sc.filter((s) => s.lang === lang); return { n: g.length, pass: g.filter((s) => s.pass).length, rate: pct(g.filter((s) => s.pass).length, g.length) }; };
  const fieldErrors = {
    category: sc.filter((s) => !s.ok.category).map((s) => s.id),
    urgency: sc.filter((s) => !s.ok.urgency).map((s) => s.id),
    unit: sc.filter((s) => !s.ok.unit).map((s) => s.id),
    unit_invented: sc.filter((s) => s.unitInvented).map((s) => s.id),
    reply_language: sc.filter((s) => !s.ok.lang).map((s) => s.id)
  };
  return { n, pass: p, rate: pct(p, n), ar: by('ar'), en: by('en'), critical: sc.filter((s) => s.critical).map((s) => s.id), failed: sc.filter((s) => !s.pass).map((s) => s.id), field_errors: fieldErrors };
}
const demoSum = summary(demoScore);
const realSum = summary(realScore);
const emergencies = { demo: DEMO.filter((c) => c[4] === 'emergency').map((c) => c[0]), realistic: REAL.filter((c) => c[5] === 'emergency').map((c) => c[0]) };

// Guards: the numbers the course states
const assert = (cond, msg) => { if (!cond) throw new Error('guard failed: ' + msg); };
assert(DEMO.length === 16 && REAL.length === 30, 'set sizes');
assert(demoSum.pass === 15 && realSum.pass === 18, 'pass counts 15/16 and 18/30');
assert(realSum.ar.n === 18 && realSum.ar.pass === 8 && realSum.en.n === 12 && realSum.en.pass === 10, 'language split');
assert(realSum.critical.join() === 'R02,R08', 'critical failures');
for (const c of [...DEMO, ...REAL]) assert(CATEGORIES.includes(c[c.length === 6 ? 3 : 4]), 'category ' + c[0]);
for (const o of [...demoOut, ...realOut]) assert(CATEGORIES.includes(o.category) && URGENCIES.includes(o.urgency), 'output ' + o.id);

// Failure types seen in each set (field level). "Only on realistic" = seen there, never in the demo.
const typesIn = (s) => Object.entries(s.field_errors).filter(([, v]) => v.length).map(([k]) => k);
const onlyRealistic = typesIn(realSum).filter((t) => !typesIn(demoSum).includes(t));
const featureFail = {};
for (const s of realScore) {
  featureFail[s.feature] ??= { n: 0, failed: 0 };
  featureFail[s.feature].n++;
  if (!s.pass) featureFail[s.feature].failed++;
}

put('files/demo_set.csv', csv([
  ['id', 'lang', 'message', 'expected_category', 'expected_urgency', 'expected_unit'],
  ...DEMO
]));
put('files/realistic_set.csv', csv([
  ['id', 'lang', 'channel', 'message', 'expected_category', 'expected_urgency', 'expected_unit'],
  ...REAL.map((c) => c.slice(0, 7))
]));
const outHeader = ['id', 'category', 'urgency', 'unit', 'reply_language', 'reply', 'source'];
put('files/outputs_demo_recorded.csv', csv([outHeader, ...demoOut.map((o) => [o.id, o.category, o.urgency, o.unit, o.reply_language, o.reply, RECORDED_NOTE])]));
put('files/outputs_realistic_recorded.csv', csv([outHeader, ...realOut.map((o) => [o.id, o.category, o.urgency, o.unit, o.reply_language, o.reply, RECORDED_NOTE])]));

put('files/p1_instructions.txt', `Maintenance-request triage: the pilot's instructions (Radhah, P1)

You read one message from a tenant of Radhah and return one line of JSON, nothing else, with the keys:
category, urgency, unit, reply_language, reply

category: one of plumbing, electrical, ac, lift, gas, pest, carpentry, appliance, general
  plumbing: water, drains, leaks, hot water, toilets, showers
  electrical: sockets, wiring, power cuts, lighting, smoke detectors, water reaching electrical points
  ac: air conditioning and thermostats
  lift: lifts
  gas: a smell of gas, or a strong unknown smell with dizziness or headache
  pest: insects and pests
  carpentry: doors, locks, windows, cupboards, the building's entrance door
  appliance: appliances provided with the unit
  general: paint, tiles, cracks, damp, cleaning, anything else

urgency: one of emergency, urgent, routine
  emergency: a risk to life or safety, or damage that is spreading: gas or a strong smell with dizziness,
    sparks or a burning smell, water reaching electrical points, a person trapped in a lift, flooding
  urgent: the home cannot be used normally: no cooling, no water or no hot water, a partial power cut,
    a lift out of service, a door that does not lock, the only toilet blocked
  routine: everything else

When a message reports more than one issue, choose the issue with the highest urgency; when two
issues have the same urgency, choose the first one mentioned. Mention the other issue in the reply.

unit: the building and unit in the form B07-0012 (building 7, unit 12). If the message does not give
both the building and the unit, write missing. Never guess a unit.

reply_language: ar if the tenant wrote in Arabic (in Arabic letters or in Latin letters), en if in English.
reply: one or two sentences to the tenant in that language. Ask for the unit when it is missing.
`);

// ======================================================================================
// Lab 1.3: data inventories of P1 and P2
// ======================================================================================

// Scoring guide (the course's own):
// access: 2 granted through a service account; 1 granted through a person's login or a file export; 0 requested or none
// quality: 2 completeness >= 95 and duplicates <= 2 and validity >= 95; 1 completeness >= 85 and duplicates <= 5 and validity >= 90; else 0
// classification: 2 classified Public, or classified with the AI use approved; 1 classified with approval requested; 0 not classified, or approval not requested where needed
// lineage: documented 2, partial 1, none 0
// refresh: 2 automated and as often as needed; 1 manual or less often than needed; 0 none
// Blocking: on a source required for production, any dimension at 0, or access through a person's login.
const INV_HEADER = ['source_id', 'source', 'system', 'owner', 'required_for_production', 'access_route', 'access_status',
  'completeness_pct', 'duplicates_pct', 'validity_pct', 'classification', 'ai_use_approval', 'lineage', 'refresh_needed', 'refresh_actual'];
const P1_INV = [
  ['S1', 'رسائل المستأجرين من التطبيق وقناة المراسلة', 'تطبيق المستأجرين', 'بدر الحمودي، مدير مركز الاتصال', 'yes', 'file_export', 'granted', 97, 4, 96, 'مقيد', 'requested', 'partial', 'continuous', 'daily manual export'],
  ['S2', 'سجل الوحدات (الوحدة والمبنى والمستأجر)', 'نظام إدارة عقود الإيجار', 'مدير عمليات التأجير', 'yes', 'service_account', 'granted', 99, 1, 98, 'مقيد', 'not_requested', 'documented', 'continuous', 'continuous automated'],
  ['S3', 'أوامر العمل: الفئات والطلبات المفتوحة والسجل', 'نظام أوامر العمل', 'ريم البطشان، مديرة إدارة الأملاك والمرافق', 'yes', 'none', 'requested', 88, 3, 91, 'مقيد', 'requested', 'partial', 'continuous', 'continuous automated'],
  ['S4', 'جدول الفنيين ومهاراتهم', 'جدول بيانات مقاول الصيانة', 'منسق عقد الصيانة', 'no', 'file_export', 'granted', 90, 0, 93, 'مقيد', 'not_requested', 'none', 'daily', 'weekly manual'],
  ['S5', 'قوالب الردود بالعربية والإنجليزية', 'قاعدة معرفة مركز الاتصال', 'بدر الحمودي، مدير مركز الاتصال', 'yes', 'service_account', 'granted', 72, 0, 95, 'عام', 'not_needed', 'documented', 'monthly', 'monthly manual'],
  ['S6', 'مجموعة التقييم الواقعية (رسائل موسومة)', 'مجلد مكتب توسيع الذكاء الاصطناعي', 'أنس الجسّار، رئيس مكتب توسيع الذكاء الاصطناعي', 'yes', 'service_account', 'granted', 100, 0, 100, 'عام', 'not_needed', 'documented', 'monthly', 'none']
];
const P2_INV = [
  ['T1', 'عقود الإيجار الموقعة (ملفات PDF)', 'مستودع الوثائق', 'منصور الحبيّب، المستشار العام', 'yes', 'personal_login', 'granted', 94, 2, 97, 'مقيد', 'approved', 'documented', 'daily', 'daily automated'],
  ['T2', 'حقول العقد في نظام السجل', 'نظام إدارة عقود الإيجار', 'نزار المحيسن، مدير تقنية المعلومات', 'yes', 'none', 'requested', 96, 1, 97, 'مقيد', 'approved', 'documented', 'daily', 'continuous automated'],
  ['T3', 'مكتبة البنود القياسية', 'مستودع الوثائق', 'منصور الحبيّب، المستشار العام', 'yes', 'service_account', 'granted', 100, 0, 91, 'مقيد', 'approved', 'partial', 'quarterly', 'manual on request'],
  ['T4', 'تقويم التجديد', 'نظام إدارة عقود الإيجار', 'مدير عمليات التأجير', 'yes', 'service_account', 'granted', 98, 0, 99, 'مقيد', 'not_requested', 'documented', 'daily', 'daily automated'],
  ['T5', 'سجل مراجعة المحامين للحقول المستخرجة', 'جدول بيانات الشؤون القانونية', 'منصور الحبيّب، المستشار العام', 'yes', 'file_export', 'granted', 81, 3, 92, 'مقيد', 'approved', 'none', 'weekly', 'manual on request'],
  ['T6', 'بيانات المستأجرين الرئيسة', 'نظام إدارة عقود الإيجار', 'مدير عمليات التأجير', 'no', 'service_account', 'granted', 97, 2, 96, 'مقيد', 'not_requested', 'documented', 'daily', 'daily automated']
];
// How often a refresh happens is compared with how often it is needed
const OFTEN = { continuous: 5, daily: 4, weekly: 3, monthly: 2, quarterly: 1 };
function refreshScore(needed, actual) {
  if (actual === 'none') return 0;
  if (actual.includes('manual')) return 1;
  const freq = actual.split(' ')[0];
  return OFTEN[freq] >= OFTEN[needed] ? 2 : 1;
}
function scoreSource(r) {
  const [id, , , owner, req, route, status, comp, dup, val, cls, appr, lin, need, act] = r;
  const access = status === 'granted' ? (route === 'service_account' ? 2 : 1) : 0;
  const quality = comp >= 95 && dup <= 2 && val >= 95 ? 2 : comp >= 85 && dup <= 5 && val >= 90 ? 1 : 0;
  const classification = cls === 'عام' || appr === 'approved' ? 2 : appr === 'requested' ? 1 : 0;
  const lineage = { documented: 2, partial: 1, none: 0 }[lin];
  const refresh = refreshScore(need, act);
  const dims = { access, quality, classification, lineage, refresh };
  const total = access + quality + classification + lineage + refresh;
  const blocking = [];
  if (req === 'yes') {
    for (const [k, v] of Object.entries(dims)) if (v === 0) blocking.push({ source: id, dimension: k, owner });
    if (route === 'personal_login') blocking.push({ source: id, dimension: 'access (agent identity: a person\'s login)', owner });
  }
  return { id, required: req === 'yes', dims, total, blocking };
}
function readiness(inv) {
  const s = inv.map(scoreSource);
  const req = s.filter((x) => x.required);
  const points = req.reduce((a, x) => a + x.total, 0);
  return { sources: s, required: req.length, points, max: req.length * 10, score_pct: pct(points, req.length * 10), blocking: req.flatMap((x) => x.blocking) };
}
const p1Ready = readiness(P1_INV);
const p2Ready = readiness(P2_INV);
assert(p1Ready.points === 33 && p1Ready.max === 50, 'P1 readiness 33/50');
assert(p2Ready.points === 35 && p2Ready.max === 50, 'P2 readiness 35/50');
assert(p1Ready.blocking.length === 4 && p2Ready.blocking.length === 5, 'blocking counts');

put('files/inventory_p1.csv', csv([INV_HEADER, ...P1_INV]));
put('files/inventory_p2.csv', csv([INV_HEADER, ...P2_INV]));

// ======================================================================================
// Lab 2.1: structure, operating models, the maintenance process
// ======================================================================================

put('files/org_structure.csv', csv([
  ['unit', 'staff', 'ai_skilled_staff', 'pilots', 'cities', 'note'],
  ['إدارة الأملاك والمرافق', 420, 0, 'P1 P6', 3, 'نحو 9,600 طلب صيانة في الشهر؛ الفنيون من مقاول صيانة بعقد سنوي'],
  ['خدمة العملاء (مركز الاتصال)', 95, 0, 'P8', 1, 'مركز واحد في الرياض يخدم المدن الثلاث'],
  ['التأجير والتسويق والمبيعات', 180, 1, 'P4 P5 P7', 3, 'التأجير، والتسويق والمبيعات؛ محلل بيانات واحد يبني التقارير'],
  ['المالية والتحصيل', 110, 3, 'P3', 1, 'ثلاثة محللين يكتبون نماذج إحصائية'],
  ['الشؤون القانونية', 22, 0, 'P2', 1, 'محامون ومساعدون قانونيون'],
  ['التطوير والمشروعات', 160, 0, '', 3, 'لا مشروع تجريبي حتى الآن'],
  ['الموارد البشرية', 40, 0, '', 1, ''],
  ['تقنية المعلومات والبيانات', 55, 9, '', 1, 'مختبر الابتكار (6) بنى المشروعات الثمانية كلها، وفريق البيانات (3)'],
  ['الإدارة التنفيذية والمكاتب المساندة', 518, 0, '', 3, 'يشمل مكتب توسيع الذكاء الاصطناعي الجديد (رئيسه وموظفان، لا مهارات بناء)']
]));
const ORG_TOTAL = 420 + 95 + 180 + 110 + 22 + 160 + 40 + 55 + 518;
const AI_SKILLED = 0 + 0 + 1 + 3 + 0 + 0 + 0 + 9 + 0;
assert(ORG_TOTAL === 1600 && AI_SKILLED === 13, 'staff 1,600 and 13 AI-skilled');

put('files/decision_rights_template.csv', csv([
  ['decision', 'proposes', 'approves', 'is_consulted', 'is_informed'],
  ['اعتماد تشغيل نظام في بيئة الإنتاج بحسب مستوى مخاطره', '', '', '', ''],
  ['اعتماد وصول النظام إلى بيانات مصنفة «مقيد» أو أعلى', '', '', '', ''],
  ['اعتماد تغيير النموذج أو التعليمات', '', '', '', ''],
  ['إيقاف نظام قيد التشغيل والرجوع إلى العملية اليدوية', '', '', '', ''],
  ['تمويل التوسع إلى مدينة أو مبنى جديد', '', '', '', ''],
  ['اعتماد تغيير العملية والأدوار في الإدارة', '', '', '', ''],
  ['تحديد مجموعة التقييم وعتباتها', '', '', '', '']
]));

// The maintenance process as it runs today, with the pilot. Staff minutes per request.
// share: the share of requests in which the step happens.
const ASIS = [
  ['A1', 'المستأجر يرسل الطلب من التطبيق أو قناة المراسلة', 'المستأجر', 'تطبيق المستأجرين', 0, 1],
  ['A2', 'الموظف يقرأ الرسالة واقتراح المشروع التجريبي في نافذة متصفح منفصلة', 'موظف مركز الاتصال', 'أداة المشروع التجريبي', 1.5, 1],
  ['A3', 'الموظف يعيد كتابة الفئة والأولوية في نظام أوامر العمل', 'موظف مركز الاتصال', 'نظام أوامر العمل', 1.0, 1],
  ['A4', 'الموظف يتصل بالمستأجر ليتأكد من رقم الوحدة', 'موظف مركز الاتصال', 'الهاتف', 3.0, 1],
  ['A5', 'المنسق يراجع جدول بيانات للطوارئ بدأه أثناء التجربة', 'منسق الصيانة', 'جدول بيانات', 1.5, 1],
  ['A6', 'المنسق يسند الطلب إلى فني برسالة في مجموعة مراسلة', 'منسق الصيانة', 'مجموعة مراسلة', 2.0, 1],
  ['A7', 'الفني يزور الوحدة ويصلح', 'فني المقاول', '', 0, 1],
  ['A8', 'الفني يسلّم ورقة العمل، وموظف إداري يدخل الإغلاق في النظام', 'موظف إداري', 'نظام أوامر العمل', 2.0, 1],
  ['A9', 'النظام يرسل رسالة نصية إلى المستأجر', 'النظام', 'نظام أوامر العمل', 0, 1]
];
const WORKAROUNDS = ['A2', 'A3', 'A4', 'A5', 'A6', 'A8'];
const asisMin = ASIS.reduce((a, s) => a + s[4] * s[5], 0);
// Before the pilot: the agent read and classified in 2.0 minutes and keyed the work order; no
// emergencies spreadsheet. 2.0 + 1.0 + 3.0 + 2.0 + 2.0 = 10.0
export const BASELINE_MIN_P1 = 10.0;
// The reference redesign (lab 2.1 solution)
const SHARE_MISSING_UNIT = 0.17; // of monthly requests, from the work-order history
const SHARE_EMERGENCY = 0.03;
const TOBE = [
  ['B1', 'المستأجر يرسل الطلب', 'المستأجر', 'تطبيق المستأجرين', 0, 1],
  ['B2', 'النموذج يفرز الطلب ويكتب الفئة والأولوية والوحدة في أمر العمل بحساب خدمة', 'النظام', 'نظام أوامر العمل', 0, 1],
  ['B3', 'قاعدة كلمات للطوارئ تعمل مع النموذج، وأي طارئ يذهب فورًا إلى المناوب ليؤكده', 'مشرف المناوبة', 'نظام أوامر العمل', 2.0, SHARE_EMERGENCY],
  ['B4', 'المنسق يؤكد الفئة والأولوية في قائمة أوامر العمل أو يصححهما', 'منسق الصيانة', 'نظام أوامر العمل', 0.5, 1],
  ['B5', 'إن كانت الوحدة «missing»: الموظف يتصل بالمستأجر', 'موظف مركز الاتصال', 'الهاتف', 3.0, SHARE_MISSING_UNIT],
  ['B6', 'المنسق يسند الطلب إلى فني داخل نظام أوامر العمل', 'منسق الصيانة', 'نظام أوامر العمل', 1.0, 1],
  ['B7', 'الفني يصلح ويغلق الطلب من تطبيق الجوال', 'فني المقاول', 'تطبيق الفنيين', 0, 1],
  ['B8', 'النظام يرسل رسالة نصية إلى المستأجر', 'النظام', 'نظام أوامر العمل', 0, 1]
];
const tobeMin = r2(TOBE.reduce((a, s) => a + s[4] * s[5], 0));
assert(asisMin === 11 && tobeMin === 2.07, 'as-is 11.0 and to-be 2.07 minutes');

put('files/p1_asis.csv', csv([['step', 'activity', 'actor', 'system', 'staff_minutes', 'share_of_requests'], ...ASIS]));
put('files/p1_tobe_template.csv', csv([['step', 'activity', 'actor', 'system', 'staff_minutes', 'share_of_requests', 'replaces_step', 'human_check', 'change_owner']]));

// A BPMN 2.0 file of the as-is process that bpmn.io opens and edits. Tasks in one row.
function bpmn(id, name, steps) {
  const W = 150, H = 80, GAP = 50, Y = 120;
  const nodes = [{ id: 'start', kind: 'startEvent', name: 'طلب صيانة' }, ...steps.map((s) => ({ id: s[0], kind: 'task', name: `${s[0]} · ${s[1]} (${s[2]})` })), { id: 'end', kind: 'endEvent', name: 'أُغلق الطلب' }];
  let x = 60;
  const shapes = [];
  for (const n of nodes) {
    const isEvent = n.kind !== 'task';
    const w = isEvent ? 36 : W, h = isEvent ? 36 : H, y = isEvent ? Y + (H - 36) / 2 : Y;
    shapes.push({ ...n, x, y, w, h });
    x += w + GAP;
  }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const flows = shapes.slice(1).map((n, i) => ({ id: `f${i + 1}`, from: shapes[i], to: n }));
  const el = shapes.map((n) => `    <bpmn:${n.kind} id="${n.id}" name="${esc(n.name)}" />`).join('\n');
  const fl = flows.map((f) => `    <bpmn:sequenceFlow id="${f.id}" sourceRef="${f.from.id}" targetRef="${f.to.id}" />`).join('\n');
  const di = shapes.map((n) => `      <bpmndi:BPMNShape id="${n.id}_di" bpmnElement="${n.id}">\n        <dc:Bounds x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" />\n      </bpmndi:BPMNShape>`).join('\n');
  const de = flows.map((f) => `      <bpmndi:BPMNEdge id="${f.id}_di" bpmnElement="${f.id}">\n        <di:waypoint x="${f.from.x + f.from.w}" y="${Y + H / 2}" />\n        <di:waypoint x="${f.to.x}" y="${Y + H / 2}" />\n      </bpmndi:BPMNEdge>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="defs_${id}" targetNamespace="https://sdaiaacademy.github.io/lds-exe-207/">
  <bpmn:process id="${id}" name="${esc(name)}" isExecutable="false">
${el}
${fl}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="diagram_${id}">
    <bpmndi:BPMNPlane id="plane_${id}" bpmnElement="${id}">
${di}
${de}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}
put('files/p1_asis.bpmn', bpmn('p1_asis', 'طلبات الصيانة في رَدهة: العملية الحالية مع المشروع التجريبي', ASIS));
put('solutions/p1_tobe.bpmn', bpmn('p1_tobe', 'طلبات الصيانة في رَدهة: العملية بعد إعادة التصميم (حل مرجعي)', TOBE));

// ======================================================================================
// The portfolio and the capstone costs
// ======================================================================================

put('files/portfolio.csv', csv([
  ['pilot', 'name', 'department', 'business_owner', 'technology', 'started', 'months', 'spend_sar', 'status_nov_2026', 'annual_value_claimed_sar'],
  ['P1', 'فرز طلبات الصيانة', 'إدارة الأملاك والمرافق', 'ريم البطشان', 'نموذج لغوي مستضاف عبر مورِّد', '2025-09', 5, 310000, 'أوقفت التجربة الميدانية بعد تسعة أيام', 1900000],
  ['P2', 'استخراج بنود عقود الإيجار', 'الشؤون القانونية', 'منصور الحبيّب', 'نموذج لغوي مستضاف', '2025-06', 7, 240000, 'اكتملت التجربة، والمخرجات لا تُستعمل', 850000],
  ['P3', 'الإنذار المبكر بتعثر سداد الإيجار', 'المالية والتحصيل', 'مدير المالية', 'نموذج تعلم آلي', '2025-03', 6, 180000, 'معلّق', 1200000],
  ['P4', 'تقييم ملاءة المستأجرين', 'التأجير والمبيعات', 'مدير التأجير', 'نموذج تعلم آلي', '2025-05', 4, 150000, 'متوقف', 400000],
  ['P5', 'محادثة آلية لمبيعات المشروعات على الخريطة', 'التسويق والمبيعات', 'مديرة التسويق', 'نموذج لغوي مستضاف', '2025-10', 3, 120000, 'أُطفئت', 600000],
  ['P6', 'التنبؤ بأحمال التبريد في المرافق المشتركة', 'إدارة الأملاك والمرافق', 'ريم البطشان', 'نموذج تعلم آلي', '2025-04', 8, 210000, 'يعمل، ولا توفير', 1500000],
  ['P7', 'توصية إيجار التجديد', 'التأجير والمبيعات', 'مدير التأجير', 'نموذج تعلم آلي', '2025-08', 6, 160000, 'يعمل، واستعماله قليل', 2100000],
  ['P8', 'تلخيص مكالمات خدمة العملاء', 'خدمة العملاء', 'بدر الحمودي', 'نموذج لغوي مستضاف', '2026-01', 3, 90000, 'اكتملت التجربة، وينتظر', 700000]
]));

put('files/diagnosis_template.csv', csv([
  ['pilot', 'main_cause', 'fact_from_the_notes', 'misleading_symptom', 'what_would_unblock_it'],
  ...['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'].map((p) => [p, '', '', '', ''])
]));

// Capstone: cost per successful task. The course's own assumptions. P2's success rate is the
// published, rounded value (0.88), so a participant who reads it from the CSV gets the key's numbers.
export const COST = {
  P1: { volume: 9600, baseline_min: BASELINE_MIN_P1, baseline_ftr: 0.95, wage: 1.5, model_per_task: 0.06, fixed_month: 18000, tobe_min: tobeMin, asis_min: asisMin, rework_min: 4.0, success: realSum.pass / realSum.n },
  P2: { volume: 1150, baseline_min: 35, baseline_ftr: 0.97, wage: 2.8, model_per_task: 0.9, fixed_month: 9000, tobe_min: 12, asis_min: 20, rework_min: 20, success: r2(106 / 120) }
};
function costPerSuccess(c, minutes, success) {
  const total = c.volume * c.model_per_task + c.fixed_month + c.volume * minutes * c.wage + c.volume * (1 - success) * c.rework_min * c.wage;
  return { monthly_total: r2(total), successes: r2(c.volume * success), per_success: r2(total / (c.volume * success)) };
}
const capstone = {};
for (const [k, c] of Object.entries(COST)) {
  capstone[k] = {
    baseline_per_task: r2(c.baseline_min * c.wage),
    baseline_per_success: r2((c.baseline_min * c.wage) / c.baseline_ftr),
    asis: costPerSuccess(c, c.asis_min, c.success),
    tobe: costPerSuccess(c, c.tobe_min, c.success)
  };
}
assert(capstone.P1.tobe.per_success === 12.4 && capstone.P1.asis.per_success === 34.73 && capstone.P1.baseline_per_success === 15.79, 'P1 capstone costs');
put('files/capstone_costs.csv', csv([
  ['parameter', 'P1', 'P2', 'meaning_ar'],
  ['monthly_volume_production', COST.P1.volume, COST.P2.volume, 'طلبات الصيانة (P1) أو العقود (P2) في الشهر عند التوسع الكامل'],
  ['baseline_staff_minutes_per_task', COST.P1.baseline_min, COST.P2.baseline_min, 'دقائق الموظفين لكل مهمة قبل المشروع التجريبي'],
  ['baseline_first_time_right', COST.P1.baseline_ftr, COST.P2.baseline_ftr, 'نسبة المهام الصحيحة من أول مرة قبل المشروع التجريبي'],
  ['loaded_cost_per_staff_minute_sar', COST.P1.wage, COST.P2.wage, 'تكلفة دقيقة الموظف بالريال: الراتب والبدلات والتكاليف غير المباشرة'],
  ['model_cost_per_task_sar', COST.P1.model_per_task, COST.P2.model_per_task, 'تكلفة النموذج المستضاف لكل مهمة بالريال عند حجم الإنتاج'],
  ['fixed_monthly_cost_sar', COST.P1.fixed_month, COST.P2.fixed_month, 'التكلفة الثابتة في الشهر بالريال: المنصة والمراقبة وتحديث التقييم والدعم'],
  ['staff_minutes_per_task_with_pilot_today', COST.P1.asis_min, COST.P2.asis_min, 'دقائق الموظفين لكل مهمة في العملية الحالية مع المشروع التجريبي وحلولها الالتفافية'],
  ['staff_minutes_per_task_after_redesign', COST.P1.tobe_min, COST.P2.tobe_min, 'P1: العملية المرجعية بعد إعادة التصميم في المختبر 2.1؛ P2: تقدير الشؤون القانونية بعد وصول الحقول إلى نظام العقود'],
  ['rework_minutes_per_failed_task', COST.P1.rework_min, COST.P2.rework_min, 'دقائق تصحيح المهمة التي أخطأ فيها النظام'],
  ['measured_success_rate', '', COST.P2.success, 'P1: اكتب نسبة النجاح على الحالات الواقعية من المختبر 1.2؛ P2: 106 من 120 عقدًا صحت حقولها كلها (0.88 مقربة)']
]));

// ======================================================================================
// The key
// ======================================================================================
const key = {
  note: 'Reference numbers for the trainer, written by labs/_tools/prepare_files.mjs. Synthetic data.',
  lab_1_2: {
    demo: demoSum, realistic: realSum, emergencies,
    failure_types_only_on_realistic: onlyRealistic,
    failures_by_feature: featureFail,
    gap_points_en_minus_ar: r1(realSum.en.rate - realSum.ar.rate)
  },
  lab_1_3: {
    P1: { score_pct: p1Ready.score_pct, points: p1Ready.points, max: p1Ready.max, sources: p1Ready.sources, blocking: p1Ready.blocking },
    P2: { score_pct: p2Ready.score_pct, points: p2Ready.points, max: p2Ready.max, sources: p2Ready.sources, blocking: p2Ready.blocking }
  },
  lab_2_1: {
    staff: ORG_TOTAL, ai_skilled: AI_SKILLED,
    workarounds: WORKAROUNDS,
    asis_staff_minutes: asisMin, baseline_staff_minutes: BASELINE_MIN_P1, tobe_staff_minutes: tobeMin,
    tobe_steps: TOBE.map((s) => ({ step: s[0], minutes: s[4], share: s[5] }))
  },
  capstone
};
put('solutions/key.json', JSON.stringify(key, null, 2) + '\n');

// ---- write or compare ----
let differ = 0;
for (const [rel, text] of out) {
  const p = join(labs, rel);
  if (CHECK) {
    const cur = existsSync(p) ? readFileSync(p, 'utf8') : null;
    if (cur !== text) { console.log('differs: ' + rel); differ++; }
  } else {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
}
if (CHECK) {
  console.log(differ ? `${differ} file(s) differ` : `all ${out.size} files match`);
  process.exit(differ ? 1 : 0);
} else {
  console.log(`wrote ${out.size} files`);
  console.log(`lab 1.2: demo ${demoSum.pass}/${demoSum.n} (${demoSum.rate}%), realistic ${realSum.pass}/${realSum.n} (${realSum.rate}%), ar ${realSum.ar.pass}/${realSum.ar.n} (${realSum.ar.rate}%), en ${realSum.en.pass}/${realSum.en.n} (${realSum.en.rate}%), critical ${realSum.critical.join(' ')}`);
  console.log(`lab 1.2: types only on realistic: ${onlyRealistic.join(', ')}`);
  console.log(`lab 1.3: P1 ${p1Ready.points}/${p1Ready.max} = ${p1Ready.score_pct}% (${p1Ready.blocking.length} blocking); P2 ${p2Ready.points}/${p2Ready.max} = ${p2Ready.score_pct}% (${p2Ready.blocking.length} blocking)`);
  console.log(`lab 2.1: as-is ${asisMin} min, baseline ${BASELINE_MIN_P1} min, to-be ${tobeMin} min`);
  console.log('capstone: ' + JSON.stringify(capstone));
}
