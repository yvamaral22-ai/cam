export default function MetricCard({ label, value, hint, tone = 'normal', icon: Icon }) {
  return (
    <article className={`metricCard ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
      {Icon && <Icon size={22} />}
    </article>
  );
}
