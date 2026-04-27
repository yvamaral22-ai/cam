export default function SeverityBadge({ severity }) {
  return <span className={`badge ${severity || 'baixa'}`}>{severity || 'baixa'}</span>;
}
