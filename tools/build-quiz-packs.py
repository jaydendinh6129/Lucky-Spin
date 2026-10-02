#!/usr/bin/env python3
"""Build js/data/quiz/*.js from the quiz-content workflow journal.

Each batch goes gen → facts → lang; we take the most-verified result available
for every batch, so this can be re-run while the workflow is still finishing.

Usage: python3 tools/build-quiz-packs.py <journal.jsonl>
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'js' / 'data' / 'quiz'

THEMES = {
    'animals': dict(
        order=1, icon='🦁', accent='#34d399', plan='free', difficulty='easy',
        title={'en': 'Animals', 'vi': 'Thế giới động vật'},
        description={'en': 'Test your knowledge of the animal kingdom.',
                     'vi': 'Thử tài hiểu biết về thế giới động vật.'},
        batches=['animals-1', 'animals-2', 'animals-3', 'animals-4'], tables={}, generate=[]),
    'flags': dict(
        order=2, icon='🏳️', accent='#60a5fa', plan='free', difficulty='medium',
        title={'en': 'Flags Around the World', 'vi': 'Quốc kỳ thế giới'},
        description={'en': "How well do you know the world's flags?",
                     'vi': 'Bạn thuộc được bao nhiêu lá quốc kỳ?'},
        batches=['flags-hand'], tables={'countries': 'flags-table'},
        generate=[{'use': 'flags', 'from': 'countries'}]),
    'iconic-animals': dict(
        order=3, icon='🐼', accent='#fbbf24', plan='free', difficulty='medium',
        title={'en': 'Representative Animals', 'vi': 'Linh vật các nước'},
        description={'en': 'Match iconic animals with the countries they represent.',
                     'vi': 'Ghép loài vật biểu tượng với quốc gia của chúng.'},
        batches=['iconic-hand'], tables={'associations': 'iconic-table'},
        generate=[{'use': 'associations', 'from': 'associations'}]),
    'mix': dict(
        order=4, icon='🎲', accent='#f472b6', plan='free', difficulty='medium',
        title={'en': 'Mix', 'vi': 'Tổng hợp'},
        description={'en': 'Anything can come up. Food, culture, countries, science and more.',
                     'vi': 'Thứ gì cũng có thể xuất hiện: ẩm thực, văn hoá, quốc gia, khoa học…'},
        batches=['mix-food', 'mix-vietnam', 'mix-asia', 'mix-west', 'mix-geo', 'mix-history',
                 'mix-science', 'mix-fun', 'mix-records', 'mix-kids-world', 'legacy'],
        tables={}, generate=[]),
}

# The 42 questions of the previous bank, kept so no content is lost (they land in Mix).
LEGACY = ROOT / 'tools' / 'legacy-questions.json'
LEGACY_TAGS = {'general': ['general'], 'beer': ['drinks'], 'music': ['music'],
               'movies': ['movies'], 'sports': ['sports']}


def load_journal(path):
    """label -> result, keeping only the last result emitted for each label."""
    labels, out = {}, {}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            o = json.loads(line)
        except ValueError:
            continue
        if o.get('type') == 'started':
            labels[o.get('agentId')] = o.get('label')
            labels[o.get('key')] = o.get('label')
            continue
        label = o.get('label') or labels.get(o.get('agentId')) or labels.get(o.get('key'))
        result = o.get('result', o.get('value'))
        if label and isinstance(result, dict):
            out[label] = result
    return out


def best(journal, batch, key):
    """Most-verified result for a batch: language check > fact check > raw generation."""
    for stage in ('lang', 'facts', 'gen'):
        r = journal.get(f'{stage}:{batch}')
        if isinstance(r, dict) and isinstance(r.get(key), list) and r[key]:
            return r[key], stage
    return [], None


def legacy_questions():
    if not LEGACY.exists():
        return []
    out = []
    for q in json.loads(LEGACY.read_text(encoding='utf-8')):
        out.append({
            'id': f"legacy-{q['id']}", 'type': 'mc', 'difficulty': q['diff'],
            'question_en': q['q']['en'], 'question_vi': q['q']['vi'],
            'options_en': q['options']['en'], 'options_vi': q['options']['vi'],
            'answer': q['a'],
            'explanation_en': (q.get('why') or {}).get('en'),
            'explanation_vi': (q.get('why') or {}).get('vi'),
            'tags': LEGACY_TAGS.get(q['cat'], [q['cat']]),
            'adult': q['cat'] == 'beer',
        })
    return out


def norm_key(q):
    return re.sub(r'[^a-z0-9]+', '', (q.get('question_en') or '').lower())[:70]


def rename(q):
    """Workflow schema uses q_en/q_vi; the data packs use question_en/question_vi."""
    if 'question_en' in q:
        return q
    out = dict(q)
    for src, dst in (('q_en', 'question_en'), ('q_vi', 'question_vi')):
        if src in out:
            out[dst] = out.pop(src)
    return out


def clean(questions, theme_id, batch, seen):
    """Drop malformed/duplicate questions and normalise fields.

    IDs must be unique across the whole theme: the engine de-duplicates by id,
    so they are namespaced per batch, not per call.
    """
    out, dropped = [], 0
    for q in map(rename, questions):
        qtype = q.get('type', 'mc')
        opts_en = ['True', 'False'] if qtype == 'tf' else (q.get('options_en') or [])
        opts_vi = ['Đúng', 'Sai'] if qtype == 'tf' else (q.get('options_vi') or opts_en)
        answer = q.get('answer')
        key = norm_key(q)
        ok = (q.get('question_en') and q.get('question_vi') and key and key not in seen
              and isinstance(answer, int) and 0 <= answer < len(opts_en)
              and len(opts_en) == (2 if qtype == 'tf' else 4)
              and len(opts_vi) == len(opts_en)
              and len(set(o.strip().lower() for o in opts_en)) == len(opts_en))
        if not ok:
            dropped += 1
            continue
        seen.add(key)
        item = {
            'id': q.get('id') or f"{theme_id}-{batch}-{len(out)}",
            'type': qtype,
            'difficulty': q.get('difficulty', 'medium'),
            'question_en': q['question_en'].strip(), 'question_vi': q['question_vi'].strip(),
            'options_en': [o.strip() for o in opts_en], 'options_vi': [o.strip() for o in opts_vi],
            'answer': answer,
            'tags': [t.lower() for t in (q.get('tags') or [])][:4] or ['general'],
        }
        if q.get('adult'):
            item['adult'] = True
        if q.get('explanation_en'):
            item['explanation_en'] = q['explanation_en'].strip()
            item['explanation_vi'] = (q.get('explanation_vi') or q['explanation_en']).strip()
        out.append(item)
    return out, dropped


def js_dump(value, indent=0):
    return json.dumps(value, ensure_ascii=False, indent=indent)


def build(journal_path):
    journal = load_journal(journal_path)
    OUT.mkdir(parents=True, exist_ok=True)
    report = {}
    for theme_id, cfg in THEMES.items():
        seen = set()
        questions, stages = [], {}
        for b in cfg['batches']:
            if b == 'legacy':
                qs, stage = legacy_questions(), 'legacy'
            else:
                qs, stage = best(journal, b, 'questions')
            kept, dropped = clean(qs, theme_id, b, seen)
            questions.extend(kept)
            if qs:
                stages[b] = f'{stage}:{len(kept)}' + (f' (-{dropped})' if dropped else '')
        tables = {}
        for name, batch in cfg['tables'].items():
            key = 'countries' if name == 'countries' else 'associations'
            rows, stage = best(journal, batch, key)
            if rows:
                tables[name] = rows
                stages[batch] = f'{stage}:{len(rows)}'
        pack = {
            'id': theme_id, 'order': cfg['order'], 'icon': cfg['icon'], 'accent': cfg['accent'],
            'plan': cfg['plan'], 'difficulty': cfg['difficulty'],
            'title': cfg['title'], 'description': cfg['description'],
            'questions': questions,
        }
        if tables:
            pack['tables'] = tables
            pack['generate'] = cfg['generate']
        header = (f"/* JParty quiz pack — {cfg['title']['en']}\n"
                  f" * Bilingual (EN/VI) question data. Hand-written questions: {len(questions)}.\n"
                  + (" * Reference tables below are expanded into questions by the generators in js/quiz/quizEngine.js.\n" if tables else '')
                  + " * Edit freely: this file is plain data, the quiz engine needs no changes.\n */\n")
        body = ("(window.JPARTY_QUIZ_PACKS = window.JPARTY_QUIZ_PACKS || []).push(\n"
                + js_dump(pack, 2) + "\n);\n")
        (OUT / f'{theme_id}.js').write_text(header + body, encoding='utf-8')
        report[theme_id] = {'questions': len(questions), 'tables': {k: len(v) for k, v in tables.items()}, 'batches': stages}
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else
          Path.home() / '.claude/projects/-Users-jaydendinh-party-spinner/8adb3ad3-6d89-4630-a73a-f073f234b8a6/subagents/workflows/wf_c83c1c89-6d0/journal.jsonl')
