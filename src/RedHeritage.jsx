import { useId } from 'react';

// Decorative vector artwork: ribbons, a star and a stylized nine-storey pagoda.
export function RedRibbons({ className = '' }) {
  const id = useId().replaceAll(':', '');
  return <svg className={`red-ribbons ${className}`} viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={`${id}-silk`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ff5140"/><stop offset=".48" stopColor="#df1724"/><stop offset="1" stopColor="#7d0015"/></linearGradient><linearGradient id={`${id}-edge`}><stop stopColor="#ffe4a3" stopOpacity="0"/><stop offset=".6" stopColor="#ffe4a3" stopOpacity=".6"/><stop offset="1" stopColor="#ffe4a3" stopOpacity="0"/></linearGradient></defs>
    <path d="M940 -110 C1000 150 1230 170 1520 68 L1510 202 C1245 270 1012 196 915 -40Z" fill={`url(#${id}-silk)`}/>
    <path d="M-140 615 C170 805 322 618 546 756 S1030 934 1510 695 L1510 899 C1078 1042 735 944 487 839 S140 962 -110 809Z" fill={`url(#${id}-silk)`}/>
    <path d="M-90 640 C180 808 322 647 546 778 S1030 951 1480 752" fill="none" stroke={`url(#${id}-edge)`} strokeWidth="1.4"/>
    <path d="M951 -80 C1040 166 1260 193 1460 123" fill="none" stroke={`url(#${id}-edge)`} strokeWidth="1.2"/>
    <path d="m1281 247 13 39h41l-33 24 13 39-34-24-33 24 13-39-34-24h41Z" fill="#ffcf80" opacity=".18"/>
  </svg>;
}
export function YananSkyline({ className = '' }) {
  return <svg className={`yanan-skyline ${className}`} viewBox="0 0 760 230" aria-hidden="true">
    <path d="M0 188Q57 154 107 170Q140 119 187 142Q221 114 261 141Q310 99 350 124Q399 106 434 147Q510 115 561 164Q624 134 672 165Q714 159 760 189V230H0Z" fill="currentColor" opacity=".17"/>
    <path d="M0 209Q71 174 130 193Q199 155 270 182Q325 157 389 184Q436 163 484 188Q552 168 621 192Q696 172 760 207V230H0Z" fill="currentColor" opacity=".3"/>
    <g fill="currentColor" transform="translate(297 8)">
      <path d="M33 0 37 13 45 19H21L29 13Z"/>
      {Array.from({ length: 9 }, (_, i) => { const y = 20 + i * 15, w = 18 + i * 3.4; return <g key={i}><path d={`M${33-w/2} ${y}H${33+w/2}L${35+w/2} ${y+11}H${31-w/2}Z`} opacity=".8"/><path d={`M${28-w/2} ${y+11}Q33 ${y+16} ${38+w/2} ${y+11}L${35+w/2} ${y+16}H${31-w/2}Z`}/><path d={`M31 ${y+4}Q33 ${y+1} 35 ${y+4}V${y+9}H31Z`} fill="#9d1821"/></g>; })}
      <path d="M5 171H61V178H5ZM10 160H56V171H10Z"/>
    </g>
    <path d="M127 208v-28q9-12 18 0v28m6 0v-28q9-12 18 0v28m6 0v-28q9-12 18 0v28m315 1v-28q11-14 22 0v28m7 0v-28q11-14 22 0v28m7 0v-28q11-14 22 0v28" fill="none" stroke="currentColor" strokeWidth="2" opacity=".65"/>
  </svg>;
}
