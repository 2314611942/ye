import { useEffect, useRef, useState } from 'react';
export const MUSIC_CREDIT = "'Reverie' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au";
export function useSound(reading, suspended = false) {
  const audio = useRef(null), context = useRef(null), intent = useRef(false);
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(.2), [effects, setEffects] = useState(true), [error, setError] = useState(false);
  const safePlay = () => {
    if (!audio.current || document.hidden || suspendedRef.current) return;
    setError(false);
    audio.current.play().catch((e) => { if (e.name !== 'AbortError') { setError(true); setPlaying(false); intent.current = false; } });
  };
  useEffect(() => {
    const track = new Audio('/audio/reverie.mp3');
    track.loop = true; track.preload = 'none'; track.volume = .2; track.muted = true;
    audio.current = track;
    track.onplay = () => setPlaying(true); track.onpause = () => setPlaying(false);
    track.onerror = () => { intent.current = false; setError(true); setPlaying(false); };
    const visibility = () => { if (document.hidden) { track.pause(); context.current?.suspend(); } else if (intent.current && !suspendedRef.current) safePlay(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { track.onplay = track.onpause = track.onerror = null; track.pause(); track.removeAttribute('src'); track.load(); audio.current = null; context.current?.close(); context.current = null; document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (suspended) { audio.current?.pause(); context.current?.suspend(); }
    else if (intent.current) safePlay();
  }, [suspended]);
  useEffect(() => { if (audio.current) { audio.current.muted = muted; audio.current.volume = volume * (reading ? .4 : 1); } }, [muted, volume, reading]);
  const start = () => { intent.current = true; setMuted(false); if (audio.current) { audio.current.muted = false; audio.current.volume = volume * (reading ? .4 : 1); } safePlay(); };
  const toggle = () => { if (playing || intent.current) { intent.current = false; audio.current?.pause(); } else start(); };
  const toggleMute = () => { const next = !muted; setMuted(next); if (audio.current) audio.current.muted = next; if (next) context.current?.suspend(); };
  const chime = (kind = 'open') => {
    if (muted || !effects || document.hidden || suspendedRef.current) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      context.current ||= new AudioContext();
      const ctx = context.current; ctx.resume().catch(() => {});
      const gain = ctx.createGain(), osc = ctx.createOscillator();
      const t = ctx.currentTime;
      osc.type = 'sine'; osc.frequency.setValueAtTime(kind === 'period' ? 392 : 523.25, t);
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.025 * volume, t + .02); gain.gain.exponentialRampToValueAtTime(.0001, t + .45);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + .5);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch { /* Interaction sounds are optional. */ }
  };
  return { playing, muted, volume, effects, error, setVolume, setEffects, start, toggle, toggleMute, chime };
}
