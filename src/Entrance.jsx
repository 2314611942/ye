import { ArrowRight, ArrowUpRight, Headphones, Star } from 'lucide-react';
import CoverReel from './CoverReel';
import { YananSkyline } from './RedHeritage';
import { sources } from './history';
import RedStar from './RedStar';

export default function Entrance({ onEnter, reducedMotion }) {
  return <section className="entrance epic-entrance" aria-labelledby="entrance-title" data-reduced={reducedMotion || undefined}>
    <div className="cover-atmosphere" aria-hidden="true">
      <picture className="cover-art">
        <source media="(max-width: 640px)" srcSet="/images/cover/epic-landscape-mobile.webp"/>
        <img src="/images/cover/epic-landscape.webp" alt="" fetchPriority="high" decoding="async" onError={event => { event.currentTarget.hidden = true; }}/>
      </picture>
      <div className="cover-light"/>
    </div>
    <CoverReel reducedMotion={reducedMotion}/>
    <header className="cover-header">
      <span><Star size={13} fill="currentColor"/>叶挺将军 · 数字纪念展</span>
      <span className="cover-era">1896 <i/> 1946</span>
    </header>
    <div className="cover-stage">
      <div className="cover-copy">
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
    <div className="cover-landscape" aria-hidden="true"><YananSkyline className="cover-yanan"/></div>
    <footer className="cover-footer"><span>铭记历史 · 薪火相传</span><RedStar/></footer>
  </section>;
}
