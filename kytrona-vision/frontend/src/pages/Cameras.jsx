import { Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client.js';
import LiveCamera from '../components/LiveCamera.jsx';

export default function Cameras({ data, refresh }) {
  const [form, setForm] = useState({ name: 'Nova Webcam', type: 'webcam', source: '0', location: 'Loja' });

  async function submit(event) {
    event.preventDefault();
    await api.createCamera({ ...form, status: 'offline' });
    await refresh();
  }

  return (
    <section className="splitPage">
      <form className="panel formPanel" onSubmit={submit}>
        <div className="panelTitle"><h2>Adicionar camera</h2><Plus size={18} /></div>
        <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Tipo
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="webcam">Webcam</option>
            <option value="video_file">Video local</option>
            <option value="rtsp">RTSP</option>
          </select>
        </label>
        <label>Source<input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></label>
        <label>Localizacao<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <button className="primaryButton">Cadastrar</button>
      </form>

      <div className="cameraGrid full">
        {data.cameras.map((camera) => <LiveCamera key={camera.id} camera={camera} />)}
      </div>
    </section>
  );
}
