#!/usr/bin/env python3
"""Offline production tool. Requires stable-ts; never imported by the website."""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def extract_lyrics(path):
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    with zipfile.ZipFile(path) as document:
        tree = ET.fromstring(document.read('word/document.xml'))
    headings = {'歌词', '主歌1', '主歌2', '副歌', '尾声'}
    paragraphs = [''.join(node.text or '' for node in p.findall('.//w:t', ns)).strip() for p in tree.findall('.//w:p', ns)]
    return [p for p in paragraphs if p and p.strip('：: []【】') not in headings]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', default='small')
    parser.add_argument('--model-dir', default='/tmp/yeting-align/models')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/epilogue/reproduced-alignment.json')
    args = parser.parse_args()
    import torch
    import stable_whisper
    track = next((ROOT / 'music').glob('*.mp3'))
    lines = extract_lyrics(ROOT / 'music/歌词.docx')
    assert len(lines) == 34, 'Expected the approved 34 lyric lines.'
    torch.set_num_threads(4)
    model = stable_whisper.load_model(args.model, device='cpu', download_root=args.model_dir)
    result = model.align(str(track), '\n'.join(lines), language='zh', original_split=True, regroup=False)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save_as_json(str(args.output))
    print('Audio SHA-256:', hashlib.sha256(track.read_bytes()).hexdigest())
    print('Generated a review candidate. Review boundaries before replacing src/epilogue-lyrics.json.')

if __name__ == '__main__':
    main()
