#!/usr/bin/env python3
"""Read the user-maintained Word master; never modify or regenerate that file."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from zipfile import ZipFile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / 'docs/叶挺将军生平活动轨迹_网页文案汇编.docx'
OUTPUT = ROOT / 'src/word-copy.json'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{' + NS['w'] + '}'


def read_master(path=MASTER):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    paragraphs = []
    for p in root.findall('.//w:body/w:p', NS):
        # Read the visible final text; deleted tracked changes use w:delText.
        text = ''.join(n.text or '' if n.tag == W + 't' else '\t' if n.tag == W + 'tab' else '\n' if n.tag == W + 'br' else '' for n in p.iter())
        style = p.find('w:pPr/w:pStyle', NS)
        paragraphs.append({'text': text, 'style': style.get(W + 'val') if style is not None else '',
                           'bookmarks': [n.get(W + 'name') for n in p.findall('w:bookmarkStart', NS)]})
    refs = {}
    for p in paragraphs:
        bookmark = next((b for b in p['bookmarks'] if b.startswith('ref_')), None)
        if bookmark:
            number = re.match(r'\[(\d+)\]', p['text'])
            if not number:
                raise ValueError('参考文献编号缺失：' + p['text'])
            refs[number[1]] = bookmark[4:].replace('_', '-')

    def split_refs(text):
        match = re.search(r'(?:\s*\[\d+\])+\s*$', text)
        if not match:
            return text, []
        numbers = re.findall(r'\[(\d+)\]', match[0])
        return text[:match.start()].rstrip(), [refs[n] for n in numbers]

    events, periods, current, section, chapter = {}, [], None, None, None
    for p in paragraphs:
        text, style = p['text'], p['style']
        if style == 'TOCGroup':
            label, title = text.split(' / ', 1)
            name, tab = label.strip().split(None, 1)
            periods.append({'chapter': name, 'tab': tab.strip(), 'title': title.strip(), 'eventIds': []})
        if style == 'Kicker' and ' / ' in text:
            chapter = text.split('·', 1)[0].strip()
        bookmark = next((b for b in p['bookmarks'] if b.startswith('event_')), None)
        if bookmark:
            event_id = bookmark[6:].replace('_', '-')
            if event_id in events:
                raise ValueError('事件书签重复：' + event_id)
            current = {'title': re.sub(r'^\d+\s+', '', text), 'sections': [], 'note': None, 'quote': None}
            events[event_id] = current
            next(period for period in periods if period['chapter'] == chapter)['eventIds'].append(event_id)
            section = None
        elif style == 'Heading1' and text == '参考文献':
            current = None
        elif current is not None:
            if style == 'Metadata':
                match = re.fullmatch(r'时间：(.*?)\s+地点：(.*)', text)
                if not match:
                    raise ValueError('事件时间或地点格式异常：' + text)
                current.update(date=match[1], location=match[2])
            elif style == 'Heading2':
                section = {'title': text, 'text': '', 'refs': []}
                current['sections'].append(section)
            elif style == 'Body':
                if section is None:
                    raise ValueError('正文缺少分节标题')
                body, identifiers = split_refs(text)
                section['text'] += ('\n' if section['text'] else '') + body
                section['refs'] = list(dict.fromkeys([*section['refs'], *identifiers]))
            elif style == 'Note':
                current['note'] = re.sub(r'^史料说明：', '', text)
            elif style == 'Quote':
                current['quote'] = {'text': text}
            elif style == 'Caption' and current['quote']:
                label, identifiers = split_refs(text)
                if len(identifiers) != 1:
                    raise ValueError('摘引缺少唯一出处')
                current['quote'].update(label=label, source=identifiers[0])
    if len(events) != 20 or len(periods) != 3 or len(refs) != 19:
        raise ValueError(f'文档结构不完整：{len(events)}事件 / {len(periods)}篇章 / {len(refs)}文献')
    for event_id, event in events.items():
        if [s['title'] for s in event['sections']] != ['历史背景', '事件经过', '历史影响']:
            raise ValueError('分节不完整：' + event_id)
        if not all(s['text'] and s['refs'] for s in event['sections']):
            raise ValueError('正文或引用缺失：' + event_id)
    return {'document': str(path.relative_to(ROOT)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'periods': periods, 'referenceIds': refs, 'events': events}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check imported content without writing')
    args = parser.parse_args()
    document = read_master()
    if args.check:
        if json.loads(OUTPUT.read_text()) != document:
            raise SystemExit('Word 与网页导入数据不同步，请运行 python3 scripts/import-copy.py')
        print('Word 同步校验通过：20个事件、60段正文、19条参考文献；原文档未修改。')
    else:
        OUTPUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n')
        print('已导入 Word 文案：src/word-copy.json（未修改 Word 原文件）')
