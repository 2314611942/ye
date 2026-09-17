import { readFileSync, writeFileSync, statSync } from 'node:fs';
const photos=JSON.parse(readFileSync('src/epilogue-photos.json'));
const mib=(photos.reduce((sum,p)=>sum+statSync(`public${p.src}`).size,0)/1024/1024).toFixed(2);
const rows=photos.map((p,i)=>`| ${String(i+1).padStart(2,'0')} | ${p.start}—${i===photos.length-1?'160.44':p.start+8}秒 | ${p.yearLabel} · ${p.title} | ${p.date} | ${p.author} | [出处](${p.sourceUrl}) · [WebP](../../public${p.src}) |`).join('\n');
const notes=photos.filter(p=>p.note).map(p=>`- **${p.title}**：${p.note}${p.factSourceUrl?` [史实核对](${p.factSourceUrl})。`:''}`).join('\n');
const rights=photos.map(p=>`| ${p.id} | ${p.type} | ${p.license} |`).join('\n');
writeFileSync('docs/epilogue/PHOTOS.md',`# 结语照片出处目录

核对日期：2026-09-17。播放20张真实照片，保留原有9张老照片，替换7张后期照片。所有播放素材为本地WebP，共${mib} MiB。网页介绍只显示年份和内容；完整日期、地点、来源和署名留存本目录。

## 时间线

| 序号 | 播放时间 | 网页介绍 | 日期及地点依据 | 作者 / 提供机构 | 资料 |
|---|---|---|---|---|---|
${rows}

## 编排依据

- **烽火铸魂（0—40秒）**：叶挺肖像作为人物序章，接1939年江北指挥部、约1940年军民支前、战前练兵、1944—1945年浙东抗日行军。全部保留原照；肖像和练兵照片具体年份未详，沿用范围说明，不补造拍摄年份。
- **自立奠基（40—88秒）**：1949年开国大典和受阅航空力量、1953年人民海军、1955年科研人才归国、1964年原子弹、1970年东方红一号。补上建国初期至“两弹一星”的发展环节。
- **科技强军（88—128秒）**：1983年银河一号、1999年阅兵装备、2003年载人航天、2012年辽宁舰、2015年天河二号实拍。国防科大成果通过“银河—天河”联系前后时代。
- **强军新篇（128—160.44秒）**：2018年歼-20、2020年北斗三号、2021年055型驱逐舰、2025年受阅坦克。以空天、信息、海上与陆上力量的发展接入结束标语。
- 除人物序章和拍摄年份未详的抗战资料图，已知年份顺序递增。年份主要表示照片年代；东方红一号卫星资料图的1970年为成果节点，另列日期依据。航天与超算展示国家科技能力，不将其全部称为武器装备。
- 2007年仪仗队退出播放，以国防科大银河一号成果补入时间线；城市夜景、长城风景、重复训练、嫦娥五号及后期辽宁舰照片也退出播放。原文件保留，旧目录见 [调整前配置](previous-photos.json)，不会加载到本轮播放。

## 图像辨析

${notes}

## 处理和权利记录

新加入照片仅按EXIF校正方向、等比例缩小至最长1600px和WebP压缩（quality 88 / method 6）。原有9张历史照片逐文件SHA-256保持一致；没有AI改绘、补色、虚构现场或去除原图内标记。低清档案照片保留原始尺寸，网页以完整主体和柔化边缘显示。宽幅舰艇、战机、超算与受阅装备在手机使用完整画面，避免裁掉主体。

| 标识 | 类型 | 来源所列许可或权利状态 |
|---|---|---|
${rights}

- [新增7张素材的来源、日期与处理记录](defense-sources.json)，含原图地址及原图/展示文件校验值。
- [完整运行配置](../../src/epilogue-photos.json)，含桌面与手机位置、展示年份与完整日期依据。
- [原Commons文件元数据](photo-metadata.json)及[军民支前馆藏说明](support-source.json)。来源未给开放许可的照片记录为原发布方保留相关权利，不将公开可读等同于开放许可。
- 准备及结束页复用[山河艺术背景](../generated-cover.json)，不计作真实照片。

[20张照片总览](photos-contact-sheet.webp) · [桌面播放总览](review-1440.webp) · [手机播放总览](review-390.webp)
`);
console.log(`Updated docs/epilogue/PHOTOS.md (${photos.length} photos, ${mib} MiB)`);
