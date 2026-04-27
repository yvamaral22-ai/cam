import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import SeverityBadge from '../components/SeverityBadge.jsx';

export default function Alerts({ data, refresh }) {
  const [severity, setSeverity] = useState('');
  const [cameraId, setCameraId] = useState('');
  const [zoneId, setZoneId] = useState('');

  const camerasById = useMemo(() => new Map(data.cameras.map((camera) => [Number(camera.id), camera])), [data.cameras]);
  const zonesById = useMemo(() => new Map(data.zones.map((zone) => [Number(zone.id), zone])), [data.zones]);

  const alerts = useMemo(() => data.alerts.filter((alert) => {
    const severityOk = !severity || alert.severity === severity;
    const cameraOk = !cameraId || String(alert.camera_id) === String(cameraId);
    const zoneOk = !zoneId || String(alert.zone_id) === String(zoneId);
    return severityOk && cameraOk && zoneOk;
  }), [data.alerts, severity, cameraId, zoneId]);

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
        <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
          <option value="">Todas zonas</option>
          {data.zones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}
        </select>
      </div>
      <div className="alertTable">
        {alerts.map((alert) => (
          <div className="alertRow" key={alert.id}>
            <SeverityBadge severity={alert.severity} />
            <div>
              <strong>{alert.type}</strong>
              <span>{alert.message}</span>
              <small>
                {camerasById.get(Number(alert.camera_id))?.name || `Camera #${alert.camera_id}`}
                {alert.zone_id ? ` | ${zonesById.get(Number(alert.zone_id))?.name || `Zona #${alert.zone_id}`}` : ' | Sem zona'}
              </small>
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
