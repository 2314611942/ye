import { ArrowRight, ArrowUpRight, Headphones, Star } from 'lucide-react';
import { ArchiveImage } from './ExhibitDialog';
import { RedRibbons, YananSkyline } from './RedHeritage';
import { media } from './media';
import { sources } from './history';
import UniversityEmblem from './UniversityEmblem';

export default function Entrance({ onEnter }) {
  return <section className="entrance epic-entrance" aria-labelledby="entrance-title">
    <div className="cover-atmosphere" aria-hidden="true"/>
    <RedRibbons className="cover-ribbons"/>
    <div className="cover-texture" aria-hidden="true"/>
    <header className="cover-header">
      <span><Star size={15} fill="currentColor"/>叶挺将军 · 数字纪念展</span>
      <span className="cover-era">1896 <i/> 1946</span>
    </header>
    <div className="cover-stage">
      <figure className="cover-portrait">
        <ArchiveImage item={media.portrait} fetchPriority="high"/>
        <figcaption><strong>叶 挺</strong><span>1896 — 1946</span></figcaption>
      </figure>
      <span className="cover-inscription" aria-hidden="true">浩气长存</span>
      <div className="cover-copy">
        <p className="cover-kicker"><span/>山河为证 · 初心不渝</p>
        <h1 id="entrance-title"><span>铁军铮骨</span><span>家国丹心</span></h1>
        <p className="cover-subtitle">叶挺将军生平活动轨迹</p>
        <blockquote className="cover-poem" cite={sources.poetry.url}>
          <p><span>我应该在</span><strong>烈火和热血中</strong><span>得到永生！</span></p>
          <cite>—— 叶挺《囚歌》节选</cite>
        </blockquote>
        <div className="cover-buttons">
          <button className="cover-enter" onClick={() => onEnter(true)}><Headphones size={17}/>开启声音并进入<ArrowRight size={18}/></button>
          <button className="cover-silent" onClick={() => onEnter(false)}>静音进入<ArrowUpRight size={16}/></button>
        </div>
      </div>
    </div>
    <div className="cover-landscape" aria-hidden="true">
      <svg viewBox="0 0 1440 250" preserveAspectRatio="none"><path d="M0 152 81 108 139 133 223 74 286 121 363 95 441 143 518 110 620 164 726 114 779 134 881 84 942 111 1048 57 1146 95 1226 30 1306 95 1386 52 1440 86V250H0Z" fill="#47131c"/><path d="M0 200 99 161 172 181 249 143 325 178 404 154 518 211 594 184 677 199 779 160 881 198 983 128 1062 161 1146 131 1246 169 1345 110 1440 143V250H0Z" fill="#230d14"/><path d="m690 250 96-44 68 21 108-44 86 24 99-40 80 23 110-57 103 44" fill="none" stroke="#b88a50" strokeOpacity=".26"/></svg>
      <YananSkyline className="cover-yanan"/>
    </div>
    <footer className="cover-footer"><span>铭记历史<span className="cover-footer-dot">·</span>薪火相传</span><UniversityEmblem/></footer>
  </section>;
}
