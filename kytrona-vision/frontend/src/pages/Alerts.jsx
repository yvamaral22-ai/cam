import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import SeverityBadge from '../components/SeverityBadge.jsx';

export default function Alerts({ data, refresh }) {
  const [severity, setSeverity] = useState('');
  const [cameraId, setCameraId] = useState('');

  const alerts = useMemo(() => data.alerts.filter((alert) => {
    const severityOk = !severity || alert.severity === severity;
    const cameraOk = !cameraId || String(alert.camera_id) === String(cameraId);
    return severityOk && cameraOk;
  }), [data.alerts, severity, cameraId]);

  async function resolve(id) {
    await api.resolveAlert(id);
    await refresh();
  }

  async function convert(id) {
    await api.convertAlertToOccurrence(id);
    await refresh();
  }

  return (
    <section className="panel">
      <div className="filters">
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">Todas gravidades</option>
          <option value="baixa">Baixa</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="critica">Critica</option>
        </select>
        <select value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
          <option value="">Todas cameras</option>
          {data.cameras.map((camera) => <option value={camera.id} key={camera.id}>{camera.name}</option>)}
        </select>
      </div>
      <div className="alertTable">
        {alerts.map((alert) => (
          <div className="alertRow" key={alert.id}>
            <SeverityBadge severity={alert.severity} />
            <div>
              <strong>{alert.type}</strong>
              <span>{alert.message}</span>
            </div>
            <time>{new Date(alert.timestamp).toLocaleString('pt-BR')}</time>
            <button onClick={() => convert(alert.id)}>Virar ocorrencia</button>
            <button disabled={alert.status === 'resolvido'} onClick={() => resolve(alert.id)}>
              {alert.status === 'resolvido' ? 'Resolvido' : 'Resolver'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
