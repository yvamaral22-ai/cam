import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client.js';

export default function Zones({ data, refresh }) {
  const firstCamera = data.cameras[0]?.id || 1;
  const [form, setForm] = useState({
    name: 'Nova Zona',
    camera_id: firstCamera,
    type: 'corredor',
    coordinates: { x: 20, y: 20, w: 30, h: 30, unit: 'percent' },
    time_limit_seconds: 180,
    people_limit: 4,
    schedule_start: '08:00',
    schedule_end: '18:00',
    active: true,
  });

  async function submit(event) {
    event.preventDefault();
    await api.createZone({ ...form, camera_id: Number(form.camera_id), time_limit_seconds: Number(form.time_limit_seconds), people_limit: Number(form.people_limit) });
    await refresh();
  }

  return (
    <section className="splitPage">
      <form className="panel formPanel" onSubmit={submit}>
        <div className="panelTitle"><h2>Nova zona</h2><ShieldAlert size={18} /></div>
        <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Camera
          <select value={form.camera_id} onChange={(e) => setForm({ ...form, camera_id: e.target.value })}>
            {data.cameras.map((camera) => <option value={camera.id} key={camera.id}>{camera.name}</option>)}
          </select>
        </label>
        <label>Tipo
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="caixa">Caixa</option>
            <option value="corredor">Corredor</option>
            <option value="estoque">Estoque</option>
            <option value="entrada">Entrada</option>
            <option value="area_restrita">Area restrita</option>
          </select>
        </label>
        <label>Limite permanencia<input type="number" value={form.time_limit_seconds} onChange={(e) => setForm({ ...form, time_limit_seconds: e.target.value })} /></label>
        <label>Limite pessoas<input type="number" value={form.people_limit} onChange={(e) => setForm({ ...form, people_limit: e.target.value })} /></label>
        <button className="primaryButton">Cadastrar zona</button>
      </form>

      <div className="panel listPanel">
        <div className="panelTitle"><h2>Zonas cadastradas</h2></div>
        <div className="zoneList">
          {data.zones.map((zone) => (
            <article key={zone.id} className="zoneItem">
              <strong>{zone.name}</strong>
              <span>{zone.type} | camera #{zone.camera_id}</span>
              <small>{zone.schedule_start} ate {zone.schedule_end} | limite {zone.time_limit_seconds}s | {zone.active ? 'ativo' : 'inativo'}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
