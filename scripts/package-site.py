"""Package the production site only; source documents and credentials stay local."""
import hashlib
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
RELEASE = ROOT / 'release'


class EntryAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script' and attrs.get('src'):
            self.paths.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'icon'):
            self.paths.append(attrs['href'])


def main():
    index = DIST / 'index.html'
    if not index.is_file():
        raise SystemExit('未找到 dist/index.html，请先运行 npm run build。')
    entry = EntryAssets()
    entry.feed(index.read_text(encoding='utf-8'))
    if not any(path.endswith('.js') for path in entry.paths):
        raise SystemExit('入口未引用构建后的 JavaScript，停止打包。')
    for path in entry.paths:
        file = (DIST / path.lstrip('/')).resolve()
        if not file.is_relative_to(DIST) or not file.is_file():
            raise SystemExit(f'入口资源缺失或路径异常：{path}')
    for source in (ROOT / 'public').rglob('*'):
        if source.is_file():
            output = DIST / source.relative_to(ROOT / 'public')
            if not output.is_file() or hashlib.sha256(source.read_bytes()).digest() != hashlib.sha256(output.read_bytes()).digest():
                raise SystemExit(f'素材缺失或内容不一致：{source.relative_to(ROOT)}')
    files = sorted(path for path in DIST.rglob('*') if path.is_file())
    if any(path.is_symlink() for path in DIST.rglob('*')):
        raise SystemExit('部署目录包含符号链接，停止打包。')
    RELEASE.mkdir(exist_ok=True)
    archive = RELEASE / 'yeting-site.zip'
    temporary = RELEASE / 'yeting-site.zip.tmp'
    with ZipFile(temporary, 'w', ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in files:
            bundle.write(path, path.relative_to(DIST).as_posix())
    with ZipFile(temporary) as bundle:
        if bundle.testzip() is not None or 'index.html' not in bundle.namelist():
            raise SystemExit('部署包校验失败。')
    temporary.replace(archive)
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    (RELEASE / 'yeting-site.sha256').write_text(f'{checksum}  {archive.name}\n', encoding='utf-8')
    manifest = {
        'builtAt': datetime.now(timezone.utc).isoformat(),
        'archive': archive.name,
        'sha256': checksum,
        'sizeBytes': archive.stat().st_size,
        'basePath': '/',
        'files': [
            {'path': path.relative_to(DIST).as_posix(), 'sizeBytes': path.stat().st_size,
             'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
            for path in files
        ],
    }
    (RELEASE / 'yeting-site-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'部署包：{archive}\n共 {len(files)} 个文件，{archive.stat().st_size / 1024 / 1024:.2f} MiB；ZIP 与全部素材校验通过。')
    print('入口 index.html 位于压缩包根目录；部署到网站根路径 /。')


if __name__ == '__main__':
    main()
