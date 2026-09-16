import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Star } from 'lucide-react';
import { RedRibbons, YananSkyline } from './RedHeritage';
import UniversityEmblem from './UniversityEmblem';
import './access-gate.css';

// A browser-side entry gate, not server authentication. Never store the password.
const ACCESS_PASSWORD = 'yanan';
const SESSION_KEY = 'yeting-access-v1';
const sessionUnlocked = () => {
  try { return sessionStorage.getItem(SESSION_KEY) === 'granted'; }
  catch { return false; }
};

export default function AccessGate({ children }) {
  const [unlocked, setUnlocked] = useState(sessionUnlocked);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);

  useEffect(() => {
    if (!unlocked) input.current?.focus();
    else document.querySelector('.cover-enter')?.focus();
  }, [unlocked]);

  const submit = event => {
    event.preventDefault();
    if (password !== ACCESS_PASSWORD) {
      setError(password ? '密码不正确，请重试。' : '请输入访问密码。');
      input.current?.focus();
      input.current?.select();
      return;
    }
    try { sessionStorage.setItem(SESSION_KEY, 'granted'); }
    catch { /* Browsing still works when session storage is unavailable. */ }
    setPassword('');
    setUnlocked(true);
  };

  if (unlocked) return children;

  return <main className="access-gate" aria-labelledby="access-title">
    <RedRibbons className="access-ribbons"/>
    <YananSkyline className="access-skyline"/>
    <header className="access-header"><span><Star size={15} fill="currentColor"/>叶挺将军 · 数字纪念展</span><span>1896 — 1946</span></header>
    <div className="access-stage">
      <section className="access-card">
        <span className="access-emblem" aria-hidden="true"><Star size={25} fill="currentColor"/></span>
        <p className="access-kicker">山河为证 · 初心不渝</p>
        <h1 id="access-title">铁军铮骨<span>家国丹心</span></h1>
        <p className="access-subtitle">叶挺将军生平活动轨迹</p>
        <form className="access-form" onSubmit={submit} noValidate>
          <label htmlFor="access-password">访问密码</label>
          <div className={`access-field ${error ? 'has-error' : ''}`}>
            <LockKeyhole size={17} aria-hidden="true"/>
            <input ref={input} id="access-password" name="exhibit-password" type={visible ? 'text' : 'password'} value={password} onChange={event => { setPassword(event.target.value); setError(''); }} placeholder="请输入密码" autoComplete="current-password" autoCapitalize="none" spellCheck={false} required aria-invalid={Boolean(error)} aria-describedby={error ? 'access-error' : undefined}/>
            <button type="button" className="access-visibility" onClick={() => setVisible(value => !value)} aria-label={visible ? '隐藏密码' : '显示密码'} aria-pressed={visible}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
          </div>
          <p id="access-error" className="access-error" role="alert">{error}</p>
          <button className="access-submit" type="submit">验证并进入<ArrowRight size={18} aria-hidden="true"/></button>
        </form>
      </section>
    </div>
    <footer className="access-footer"><span>铭记历史 · 薪火相传</span><UniversityEmblem/></footer>
  </main>;
}
