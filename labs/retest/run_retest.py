# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Runs the maintenance-request triage pilot (P1) of LDS-EXE-207 on its two case sets.

With a hosted model: set three environment variables (see .env.example), taken from your
provider's own documentation and model list: LLM_BASE_URL (an OpenAI-compatible chat completions
address), LLM_MODEL and LLM_API_KEY. Each case is sent with the pilot's instructions
(files/p1_instructions.txt) and the answer is saved as a row of fields.

Without them, or when the model does not answer a case, the script uses the recorded run in
files/outputs_*_recorded.csv for that case. The recorded run was designed by the course to show
typical failure patterns; it was not produced by a model. The column "source" says which one
each row is.

    uv run labs/retest/run_retest.py              # both sets: 16 demo cases and 30 realistic ones
    uv run labs/retest/run_retest.py realistic    # one set
    uv run labs/retest/run_retest.py --recorded   # force the recorded run

It saves labs/retest/runs/outputs_demo.csv and outputs_realistic.csv. It does not score: you
score the outputs in your spreadsheet with the lab's rules. Only the synthetic files of the
course are sent. Never put real messages from your organisation in.
"""
import csv
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

LABS = Path(__file__).resolve().parent.parent
FILES = LABS / 'files'
RUNS = Path(__file__).resolve().parent / 'runs'
KEYS = ['category', 'urgency', 'unit', 'reply_language', 'reply']
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def read_csv(path):
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def ask(instructions, message):
    base, model, key = (os.environ.get(k) for k in ('LLM_BASE_URL', 'LLM_MODEL', 'LLM_API_KEY'))
    if not (base and model and key):
        return None
    body = json.dumps({'model': model, 'temperature': 0,
                       'messages': [{'role': 'system', 'content': instructions},
                                    {'role': 'user', 'content': message}]}).encode('utf-8')
    req = urllib.request.Request(base.rstrip('/') + '/chat/completions', data=body,
                                 headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read())['choices'][0]['message']['content'].strip()
    except Exception as e:  # a busy free model, a wrong key, no network
        print(f'  the model did not answer ({type(e).__name__}); using the recorded row for this case')
        return None


def parse(reply):
    if not reply:
        return None
    m = re.search(r'\{.*\}', reply, re.S)
    if not m:
        return None
    try:
        got = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    return {k: str(got.get(k, '')).strip() for k in KEYS}


def run(which, force):
    instructions = (FILES / 'p1_instructions.txt').read_text(encoding='utf-8')
    cases = read_csv(FILES / f'{which}_set.csv')
    recorded = {r['id']: r for r in read_csv(FILES / f'outputs_{which}_recorded.csv')}
    have_model = all(os.environ.get(k) for k in ('LLM_BASE_URL', 'LLM_MODEL', 'LLM_API_KEY'))
    if not have_model and not force:
        print('no hosted model configured (LLM_BASE_URL, LLM_MODEL, LLM_API_KEY): replaying the recorded run')
    rows, from_model = [], 0
    for c in cases:
        got = None if force else parse(ask(instructions, c['message']))
        if got is None:
            rec = recorded[c['id']]
            got = {k: rec[k] for k in KEYS}
            source = rec['source']
        else:
            source = 'model: ' + os.environ.get('LLM_MODEL', '')
            from_model += 1
        rows.append([c['id'], *[got[k] for k in KEYS], source])
        print(f"{c['id']} {got['category']:<10} {got['urgency']:<9} {got['unit']:<9} {got['reply_language']}  ({'model' if source.startswith('model') else 'recorded'})")
    RUNS.mkdir(exist_ok=True)
    path = RUNS / f'outputs_{which}.csv'
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['id', *KEYS, 'source'])
        w.writerows(rows)
    print(f'{which}: {len(rows)} cases, {from_model} answered by the model; saved {path.relative_to(LABS).as_posix()}')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--recorded' in sys.argv
    sets = args or ['demo', 'realistic']
    for s in sets:
        if s not in ('demo', 'realistic'):
            sys.exit(f'unknown set "{s}": use demo or realistic')
        run(s, force)
