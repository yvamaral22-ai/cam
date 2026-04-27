import { AlertTriangle, Camera, ClipboardList, Clock, MapPinned, ShieldAlert, Users } from 'lucide-react';
import LiveCamera from '../components/LiveCamera.jsx';
import MetricCard from '../components/MetricCard.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';

export default function Dashboard({ data }) {
  const overview = data.overview || {};
  const maxHour = Math.max(...(overview.alerts_by_hour || []).map((item) => item.total), 1);

  return (
    <section className="pageGrid">
      <div className="metrics">
        <MetricCard label="Cameras online" value={overview.online_cameras ?? 0} hint="Streams locais" icon={Camera} />
        <MetricCard label="Pessoas hoje" value={overview.people_today ?? 0} hint="Deteccoes anonimas" icon={Users} />
        <MetricCard label="Alertas criticos" value={overview.critical_alerts ?? 0} tone="danger" hint="Pendentes" icon={AlertTriangle} />
        <MetricCard label="Zonas ativas" value={overview.monitored_zones ?? 0} hint="Monitoradas" icon={MapPinned} />
        <MetricCard label="Ocorrencias abertas" value={overview.occurrences_open ?? 0} hint="Em analise" icon={ClipboardList} />
        <MetricCard label="Ocorrencias criticas" value={overview.occurrences_critical ?? 0} tone="danger" hint="Sem biometria" icon={ShieldAlert} />
        <MetricCard label="Watchlist ativa" value={overview.watchlist_active ?? 0} hint="Manual e operacional" icon={ShieldAlert} />
      </div>

      <div className="contentGrid">
        <article className="panel wide">
          <div className="panelTitle">
            <h2>Alertas por horario</h2>
            <Clock size={18} />
          </div>
          <div className="barChart">
            {(overview.alerts_by_hour || []).map((item) => (
              <div key={item.hour} className="barItem">
                <div className="barTrack"><span style={{ height: `${(item.total / maxHour) * 100}%` }} /></div>
                <small>{item.hour}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panelTitle"><h2>Ocorrencias por tipo</h2></div>
          <div className="ranking">
            {(overview.occurrences_by_type || []).map((item, index) => (
              <div key={item.type} className="rankRow">
                <span>{index + 1}</span>
                <strong>{item.type.replaceAll('_', ' ')}</strong>
                <em>{item.total}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="panel wide">
          <div className="panelTitle"><h2>Alertas recentes</h2></div>
          <div className="table">
            {(data.alerts || []).slice(0, 6).map((alert) => (
              <div className="tableRow" key={alert.id}>
                <SeverityBadge severity={alert.severity} />
                <span>{alert.message}</span>
                <time>{new Date(alert.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            ))}
          </div>
        </article>

        <article className="panel wide">
          <div className="panelTitle"><h2>Ultimas ocorrencias</h2></div>
          <div className="table">
            {(overview.recent_occurrences || []).map((occurrence) => (
              <div className="tableRow" key={occurrence.id}>
                <SeverityBadge severity={occurrence.severity} />
                <span>{occurrence.description}</span>
                <time>{new Date(occurrence.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="cameraGrid">
        {data.cameras.slice(0, 2).map((camera) => <LiveCamera key={camera.id} camera={camera} />)}
      </div>
    </section>
  );
}
