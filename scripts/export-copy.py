#!/usr/bin/env python3
"""Export a separate website copy; never overwrite the user-maintained Word master."""

import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape, quoteattr
from zipfile import ZipFile, ZIP_DEFLATED


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "docs" / "叶挺将军生平活动轨迹_网页文案导出.docx"
data = json.loads(subprocess.check_output([
    "node", "--input-type=module", "-e",
    "import { periods, sources } from './src/history.js'; "
    "console.log(JSON.stringify({periods,sources}));",
], cwd=ROOT, text=True))
periods, sources = data["periods"], data["sources"]
events = [event for period in periods for event in period["events"]]
used_sources = list(dict.fromkeys(
    source for event in events
    for source in [*[ref for section in event["sections"] for ref in section["refs"]],
                   *([event["quote"]["source"]] if event.get("quote") else [])]
))
ref_numbers = {source: index + 1 for index, source in enumerate(used_sources)}
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"w": W}
rels = [
    ("rStyles", "styles", "styles.xml", False),
    ("rSettings", "settings", "settings.xml", False),
    ("rHeader", "header", "header1.xml", False),
    ("rFooter", "footer", "footer1.xml", False),
]
bookmark_id = 0


def run(text, color=None, size=None, bold=False, superscript=False):
    props = (f'<w:color w:val="{color}"/>' if color else "")
    props += f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>' if size else ""
    props += '<w:b/><w:bCs/>' if bold else ""
    props += '<w:vertAlign w:val="superscript"/>' if superscript else ""
    return f'<w:r><w:rPr>{props}</w:rPr><w:t xml:space="preserve">{escape(str(text))}</w:t></w:r>'


def link(text, anchor=None, url=None, **kwargs):
    if url:
        rid = f"rLink{len(rels)}"
        rels.append((rid, "hyperlink", url, True))
        attributes = f'r:id="{rid}"'
    else:
        attributes = f'w:anchor={quoteattr(anchor)}'
    return f'<w:hyperlink {attributes} w:history="1">{run(text, **kwargs)}</w:hyperlink>'


def paragraph(text="", style="Normal", inner=None, extra="", bookmark=None):
    global bookmark_id
    content = run(text) if inner is None else inner
    if bookmark:
        bookmark_id += 1
        content = f'<w:bookmarkStart w:id="{bookmark_id}" w:name="{bookmark}"/>{content}<w:bookmarkEnd w:id="{bookmark_id}"/>'
    return f'<w:p><w:pPr><w:pStyle w:val="{style}"/>{extra}</w:pPr>{content}</w:p>'


def style(name, size, color="302B28", before=0, after=0, line=360,
          bold=False, font="Noto Serif CJK SC", extra=""):
    return f'''<w:style w:type="paragraph" w:styleId="{name}"><w:name w:val="{name}"/>
      <w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
      <w:pPr><w:spacing w:before="{before}" w:after="{after}" w:line="{line}" w:lineRule="exact"/>{extra}</w:pPr>
      <w:rPr><w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:eastAsia="{font}"/>
      <w:color w:val="{color}"/><w:sz w:val="{size}"/><w:szCs w:val="{size}"/>{'<w:b/><w:bCs/>' if bold else ''}</w:rPr></w:style>'''


styles = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{W}">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Noto Serif CJK SC" w:hAnsi="Noto Serif CJK SC" w:eastAsia="Noto Serif CJK SC"/>
<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="zh-CN" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>
<w:pPr><w:widowControl/><w:spacing w:after="100" w:line="380" w:lineRule="exact"/></w:pPr></w:style>
{style('Body', 22, line=380, after=100, extra='<w:jc w:val="both"/><w:ind w:firstLine="440"/>')}
{style('Kicker', 18, 'AA2531', after=140, line=280, font='Noto Sans CJK SC', extra='<w:keepNext/>')}
{style('Heading1', 36, '8F1D2B', after=200, line=500, bold=True, extra='<w:keepNext/><w:outlineLvl w:val="0"/>')}
{style('Heading2', 23, '8F1D2B', before=130, after=80, line=320, bold=True, extra='<w:keepNext/><w:outlineLvl w:val="1"/>')}
{style('Metadata', 19, '72645A', after=200, line=300, font='Noto Sans CJK SC', extra='<w:keepNext/>')}
{style('Note', 18, '6D6259', before=60, after=100, line=290, extra='<w:jc w:val="both"/>')}
{style('Quote', 25, '8F1D2B', before=160, after=100, line=360, extra='<w:keepNext/><w:ind w:left="240"/><w:pBdr><w:left w:val="single" w:sz="15" w:space="10" w:color="BA9256"/></w:pBdr>')}
{style('Caption', 17, '76685B', after=100, line=260)}
{style('Reference', 19, before=100, after=50, line=290, extra='<w:keepNext/>')}
{style('RefUrl', 16, '7F333B', after=150, line=230)}
{style('TOCGroup', 24, '8F1D2B', before=220, after=100, line=340, bold=True, extra='<w:keepNext/>')}
{style('TOCRow', 20, after=80, line=310, extra='<w:tabs><w:tab w:val="left" w:pos="520"/><w:tab w:val="left" w:pos="2440"/></w:tabs>')}
{style('Footer', 16, '90796C', after=0, line=220, font='Noto Sans CJK SC')}
</w:styles>'''

body = []
body.append(paragraph("国防科技大学", "Kicker", extra='<w:spacing w:before="1000" w:after="1400"/>'))
body.append(paragraph("铁军铮骨 · 家国丹心", "Metadata", extra='<w:spacing w:after="360"/>'))
body.append(paragraph(inner=run("叶挺将军", size=64, bold=True, color="8F1D2B"), extra='<w:spacing w:line="850" w:lineRule="exact" w:after="180"/>'))
body.append(paragraph(inner=run("生平活动轨迹", size=50, bold=True, color="8F1D2B"), extra='<w:spacing w:line="720" w:lineRule="exact" w:after="500"/>'))
body.append(paragraph("网页文案汇编", "Heading2", extra='<w:pBdr><w:bottom w:val="single" w:sz="14" w:space="20" w:color="BA9256"/></w:pBdr><w:spacing w:after="700"/>'))
body.append(paragraph("1896—1946", "Heading1"))
body.append(paragraph("三个时期  /  二十个历史节点", "Metadata"))
for period in periods:
    body.append(paragraph(f'{period["chapter"]}　{period["rangeLabel"]}', "Note"))
body.append(paragraph("依据现有网页文案整理，保留正文、史料说明与摘引。", "Caption", extra='<w:spacing w:before="800"/>'))

body.append(paragraph("事件目录", "Heading1", extra='<w:pageBreakBefore/>'))
body.append(paragraph("按网页时间轴顺序编排；点击标题可跳转至对应事件。", "Caption"))
event_number = 0
for period in periods:
    body.append(paragraph(f'{period["chapter"]}  {period["rangeLabel"]}  /  {period["title"]}', "TOCGroup"))
    for event in period["events"]:
        event_number += 1
        inner = run(f"{event_number:02d}", color="AA2531") + '<w:r><w:tab/></w:r>'
        inner += run(event["date"], size=18, color="72645A") + '<w:r><w:tab/></w:r>'
        inner += link(event["title"], anchor="event_" + event["id"].replace("-", "_"))
        body.append(paragraph(style="TOCRow", inner=inner))

event_number = 0
for period in periods:
    for event in period["events"]:
        event_number += 1
        body.append(paragraph(f'{period["chapter"]}  ·  {period["rangeLabel"]}  /  {period["title"]}', "Kicker", extra='<w:pageBreakBefore/>'))
        body.append(paragraph(f'{event_number:02d}  {event["title"]}', "Heading1", bookmark="event_" + event["id"].replace("-", "_")))
        body.append(paragraph(f'时间：{event["date"]}    地点：{event["location"]}', "Metadata"))
        for section in event["sections"]:
            body.append(paragraph(section["title"], "Heading2"))
            inner = run(section["text"])
            for source in section["refs"]:
                inner += link(f'[{ref_numbers[source]}]', anchor="ref_" + source.replace("-", "_"), color="AA2531", size=16, superscript=True)
            body.append(paragraph(style="Body", inner=inner))
        if event.get("quote"):
            quote = event["quote"]
            body.append(paragraph(quote["text"], "Quote"))
            body.append(paragraph(style="Caption", inner=run(quote["label"]) + link(
                f' [{ref_numbers[quote["source"]]}]', anchor="ref_" + quote["source"].replace("-", "_"), color="AA2531")))
        if event.get("note"):
            body.append(paragraph(style="Note", inner=run("史料说明：", bold=True) + run(event["note"])))

body.append(paragraph("参考文献", "Heading1", extra='<w:pageBreakBefore/>'))
body.append(paragraph("正文引用统一编号，按首次出现顺序排列；保留网页中的机构、作者、日期与原文链接。", "Note"))
for source in used_sources:
    ref = sources[source]
    body.append(paragraph(style="Reference", inner=run(f'[{ref_numbers[source]}] {ref["title"]}', bold=True, color="8F1D2B"), bookmark="ref_" + source.replace("-", "_")))
    byline = ref["name"] if ref["name"] == ref["author"] else f'{ref["author"]}；{ref["name"]}'
    body.append(paragraph(f'{byline}；{ref["date"]}。性质：{ref["kind"]}。', "Caption", extra='<w:keepNext/>'))
    body.append(paragraph(style="RefUrl", inner=link(ref["url"], url=ref["url"], color="7F333B", size=16)))

section_props = '''<w:sectPr><w:headerReference w:type="default" r:id="rHeader"/>
<w:footerReference w:type="default" r:id="rFooter"/><w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1000" w:right="1100" w:bottom="1000" w:left="1200" w:header="480" w:footer="480"/>
<w:titlePg/></w:sectPr>'''
document = f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="{W}" xmlns:r="{R}"><w:body>{"".join(body)}{section_props}</w:body></w:document>'
header = f'<w:hdr xmlns:w="{W}">{paragraph("叶挺将军生平活动轨迹  /  网页文案汇编", "Footer", extra="<w:pBdr><w:bottom w:val=\"single\" w:sz=\"4\" w:space=\"8\" w:color=\"D9C9B4\"/></w:pBdr>")}</w:hdr>'
footer_inner = run("国防科技大学", size=16, color="90796C") + '<w:r><w:tab/></w:r>'
footer_inner += run("·  ", size=16) + '<w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>' + run("  ·", size=16)
footer = f'<w:ftr xmlns:w="{W}">{paragraph(style="Footer", inner=footer_inner, extra="<w:tabs><w:tab w:val=\"right\" w:pos=\"9606\"/></w:tabs>")}</w:ftr>'
relationships = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
for rid, rel_type, target, external in rels:
    relationships += f'<Relationship Id="{rid}" Type="{R}/{rel_type}" Target={quoteattr(target)}' + (' TargetMode="External"' if external else '') + '/>'
relationships += '</Relationships>'
content_types = '''<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>'''
package_rels = f'''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rDocument" Type="{R}/officeDocument" Target="word/document.xml"/>
<Relationship Id="rCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>'''
core = '''<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>叶挺将军生平活动轨迹 · 网页文案汇编</dc:title><dc:creator>国防科技大学</dc:creator>
<dc:description>三个时期、二十个事件；含分节正文、史料摘引、史料说明及参考文献。</dc:description><dc:language>zh-CN</dc:language></cp:coreProperties>'''
parts = {
    '[Content_Types].xml': content_types, '_rels/.rels': package_rels,
    'word/document.xml': document, 'word/styles.xml': styles,
    'word/settings.xml': f'<w:settings xmlns:w="{W}"><w:defaultTabStop w:val="420"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat/></w:settings>',
    'word/_rels/document.xml.rels': relationships, 'word/header1.xml': header,
    'word/footer1.xml': footer, 'docProps/core.xml': core,
}
for name, xml in parts.items():
    ET.fromstring(xml)
with ZipFile(OUTPUT, 'w', ZIP_DEFLATED) as archive:
    for name, xml in parts.items():
        archive.writestr(name, xml.encode('utf-8'))

# Verify that the exported document includes every source paragraph without rewriting it.
tree = ET.fromstring(document)
plain = ''.join(tree.itertext())
for event in events:
    assert event['title'] in plain, event['id']
    for item in event['sections']:
        assert item['text'] in plain, event['id']
    if event.get('note'):
        assert event['note'] in plain, event['id']
    if event.get('quote'):
        assert event['quote']['text'] in plain, event['id']
assert len(events) == 20
anchors = {node.attrib[f'{{{W}}}name'] for node in tree.findall('.//w:bookmarkStart', NS)}
assert all(node.attrib[f'{{{W}}}anchor'] in anchors for node in tree.findall('.//w:hyperlink', NS) if f'{{{W}}}anchor' in node.attrib)
print(json.dumps({'file': str(OUTPUT), 'events': len(events), 'paragraphs': sum(len(e['sections']) for e in events), 'references': len(used_sources), 'bytes': OUTPUT.stat().st_size}, ensure_ascii=False, indent=2))
