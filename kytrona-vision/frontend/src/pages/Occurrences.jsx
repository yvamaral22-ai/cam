import { ClipboardPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import SeverityBadge from '../components/SeverityBadge.jsx';

const initialForm = {
  type: 'comportamento_suspeito',
  severity: 'media',
  camera_id: 1,
  zone_id: '',
  description: 'Ocorrencia registrada manualmente pela seguranca.',
  snapshot_path: '',
  video_clip_path: '',
  status: 'em_analise',
  registered_by: 'Operador',
  notes: '',
};

export default function Occurrences({ data, refresh }) {
  const [filters, setFilters] = useState({ type: '', severity: '', status: '' });
  const [form, setForm] = useState({ ...initialForm, camera_id: data.cameras[0]?.id || 1 });

  const occurrences = useMemo(() => data.occurrences.filter((item) => {
    return (!filters.type || item.type === filters.type)
      && (!filters.severity || item.severity === filters.severity)
      && (!filters.status || item.status === filters.status);
  }), [data.occurrences, filters]);

  async function submit(event) {
    event.preventDefault();
    await api.createOccurrence({
      ...form,
      camera_id: Number(form.camera_id),
      zone_id: form.zone_id ? Number(form.zone_id) : null,
      snapshot_path: form.snapshot_path || null,
      video_clip_path: form.video_clip_path || null,
      notes: form.notes || null,
    });
    setForm({ ...initialForm, camera_id: data.cameras[0]?.id || 1 });
    await refresh();
  }

  async function setStatus(id, status) {
    await api.updateOccurrence(id, { status });
    await refresh();
  }

  async function saveNotes(id, notes) {
    await api.updateOccurrence(id, { notes });
    await refresh();
  }

  return (
    <section className="splitPage occurrencesPage">
      <form className="panel formPanel" onSubmit={submit}>
        <div className="panelTitle"><h2>Nova ocorrencia</h2><ClipboardPlus size={18} /></div>
        <label>Tipo
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="furto">Furto</option>
            <option value="roubo">Roubo</option>
            <option value="comportamento_suspeito">Comportamento suspeito</option>
            <option value="acesso_indevido">Acesso indevido</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <label>Gravidade
          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option value="baixa">Baixa</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Critica</option>
          </select>
        </label>
        <label>Camera
          <select value={form.camera_id} onChange={(e) => setForm({ ...form, camera_id: e.target.value })}>
            {data.cameras.map((camera) => <option value={camera.id} key={camera.id}>{camera.name}</option>)}
          </select>
        </label>
        <label>Zona
          <select value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })}>
            <option value="">Sem zona</option>
            {data.zones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}
          </select>
        </label>
        <label>Descricao<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Registrado por<input value={form.registered_by} onChange={(e) => setForm({ ...form, registered_by: e.target.value })} /></label>
        <label>Snapshot<input value={form.snapshot_path} onChange={(e) => setForm({ ...form, snapshot_path: e.target.value })} /></label>
        <label>Clipe de video<input value={form.video_clip_path} onChange={(e) => setForm({ ...form, video_clip_path: e.target.value })} /></label>
        <label>Observacoes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <button className="primaryButton">Nova ocorrencia</button>
      </form>

      <div className="occurrenceStack">
        <div className="panel watchlistPanel">
          <div className="panelTitle"><h2>Watchlist operacional</h2></div>
          <div className="watchlistGrid">
            {data.watchlist.map((item) => (
              <article key={item.id} className="watchlistItem">
                <SeverityBadge severity={item.severity} />
                <strong>{item.title}</strong>
                <span>{item.description}</span>
                <small>{item.instructions || 'Monitoramento manual sem biometria.'}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="panel listPanel">
          <div className="filters">
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="">Todos tipos</option>
              <option value="furto">Furto</option>
              <option value="roubo">Roubo</option>
              <option value="comportamento_suspeito">Comportamento suspeito</option>
              <option value="acesso_indevido">Acesso indevido</option>
              <option value="outro">Outro</option>
            </select>
            <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
              <option value="">Todas gravidades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Todos status</option>
              <option value="em_analise">Em analise</option>
              <option value="confirmado">Confirmado</option>
              <option value="falso_positivo">Falso positivo</option>
              <option value="resolvido">Resolvido</option>
            </select>
          </div>

          <div className="occurrenceList">
            {occurrences.map((item) => (
              <article className="occurrenceItem" key={item.id}>
                <div className="occurrenceTop">
                  <SeverityBadge severity={item.severity} />
                  <strong>{item.type.replaceAll('_', ' ')}</strong>
                  <time>{new Date(item.data_hora).toLocaleString('pt-BR')}</time>
                </div>
                <p>{item.description}</p>
                <div className="evidenceLine">
                  <span>Status: {item.status.replaceAll('_', ' ')}</span>
                  <span>Camera #{item.camera_id}</span>
                  {item.snapshot_path && <span>Imagem: {item.snapshot_path}</span>}
                  {item.video_clip_path && <span>Video: {item.video_clip_path}</span>}
                </div>
                <label>Observacoes
                  <textarea defaultValue={item.notes || ''} onBlur={(e) => saveNotes(item.id, e.target.value)} />
                </label>
                <div className="actions">
                  <button onClick={() => setStatus(item.id, 'resolvido')}>Marcar como resolvido</button>
                  <button onClick={() => setStatus(item.id, 'falso_positivo')}>Marcar como falso positivo</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
