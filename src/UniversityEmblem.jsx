import './university-emblem.css';

export default function UniversityEmblem({ className = '' }) {
  return <img className={`university-emblem ${className}`} src="/images/identity/nudt-emblem.png" alt="国防科技大学校徽" width="56" height="56" decoding="async"/>;
}
