import './red-star.css';

export default function RedStar({ className = '' }) {
  return <img className={`red-star ${className}`} src="/images/identity/red-star.svg" alt="红色五角星" width="56" height="56" decoding="async"/>;
}
