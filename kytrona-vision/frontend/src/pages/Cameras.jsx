import { Mic, MicOff, Plus, Radio, Square, Tag, Trash2, Video, Volume2, VolumeX, ZoomIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import LiveCamera from '../components/LiveCamera.jsx';

const sourceHelp = {
  webcam: 'Use 0 para a webcam principal, 1 para a segunda webcam.',
  video_file: 'Use um caminho local, exemplo: videos/exemplo.mp4',
  ip_camera: 'Use a URL do stream da camera IP na rede. Exemplos: http://192.168.0.20:8080/video, http://192.168.0.30/mjpeg ou rtsp://usuario:senha@192.168.0.40:554/stream1',
  rtsp: 'Use a URL completa, exemplo: rtsp://usuario:senha@192.168.0.10/stream',
};

const defaultSourceByType = {
  webcam: '0',
  video_file: 'videos/exemplo.mp4',
  ip_camera: 'http://192.168.0.20:8080/video',
  rtsp: 'rtsp://usuario:senha@ip/stream',
};

export default function Cameras({ data, refresh }) {
  const [form, setForm] = useState({ name: '', type: 'webcam', source: '0', location: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [controls, setControls] = useState(null);
  const [detectionRules, setDetectionRules] = useState([]);
  const [detectionForm, setDetectionForm] = useState({ label: 'Pessoa', target_class: 'person', active: true });
  const [detectionStatus, setDetectionStatus] = useState(null);
  const [consoleError, setConsoleError] = useState('');
  const [detectionFeedback, setDetectionFeedback] = useState('');
  const [savingDetection, setSavingDetection] = useState(false);
  const [streamVersion, setStreamVersion] = useState(Date.now());
  const hasActiveDetection = detectionRules.some((rule) => rule.active);

  useEffect(() => {
    api.getDetectionStatus().then(setDetectionStatus).catch(() => {
      setDetectionStatus({ available: false, message: 'Nao foi possivel consultar o status da deteccao.' });
    });
  }, []);

  async function openCamera(camera) {
    setSelectedCamera(camera);
    setConsoleError('');
    setControls({
      zoom: 1,
      audio_enabled: false,
      microphone_enabled: false,
      recording: false,
      recording_requested: false,
      recording_path: null,
      last_message: 'Carregando controles...',
    });
    setDetectionRules([]);
    setDetectionFeedback('');
    setStreamVersion(Date.now());

    try {
      const [state, rules] = await Promise.all([
        api.getCameraControls(camera.id),
        api.getCameraDetections(camera.id),
      ]);
      setControls(state);
      setDetectionRules(rules);
    } catch (error) {
      setConsoleError(`Nao foi possivel carregar os controles desta camera. Reinicie o backend e tente novamente. Detalhe: ${error.message}`);
      setControls((current) => ({
        ...(current || {}),
        zoom: current?.zoom || 1,
        audio_enabled: false,
        microphone_enabled: false,
        recording: false,
        recording_requested: false,
        recording_path: null,
        last_message: 'Controles indisponiveis',
      }));
    }
  }

  async function updateControls(payload) {
    if (!selectedCamera) return;
    try {
      const state = await api.updateCameraControls(selectedCamera.id, payload);
      setControls(state);
    } catch (error) {
      setConsoleError(`Falha ao atualizar controles. Detalhe: ${error.message}`);
    }
  }

  async function toggleRecording() {
    if (!selectedCamera) return;
    try {
      const state = controls?.recording || controls?.recording_requested
        ? await api.stopRecording(selectedCamera.id)
        : await api.startRecording(selectedCamera.id);
      setControls(state);
    } catch (error) {
      setConsoleError(`Falha ao controlar gravacao. Detalhe: ${error.message}`);
    }
  }

  async function addDetectionRule(event) {
    event.preventDefault();
    if (!selectedCamera) return;
    if (!detectionForm.label.trim()) {
      setDetectionFeedback('Informe um nome para a marcacao.');
      return;
    }
    setSavingDetection(true);
    setDetectionFeedback('Salvando identificacao...');
    try {
      const created = await api.createCameraDetection(selectedCamera.id, {
        ...detectionForm,
        label: detectionForm.label.trim(),
      });
      setDetectionRules((current) => [created, ...current]);
      setDetectionForm({ label: 'Pessoa', target_class: 'person', active: true });
      setDetectionFeedback('Identificacao adicionada. Esta camera agora vai buscar pessoas quando o stream estiver aberto.');
      setStreamVersion(Date.now());
    } catch (error) {
      setDetectionFeedback(`Falha ao adicionar identificacao. ${error.message}`);
    } finally {
      setSavingDetection(false);
    }
  }

  async function toggleDetectionRule(rule) {
    if (!selectedCamera) return;
    try {
      await api.updateCameraDetection(selectedCamera.id, rule.id, { active: !rule.active });
      setDetectionRules(await api.getCameraDetections(selectedCamera.id));
    } catch (error) {
      setConsoleError(`Falha ao alterar identificacao. Detalhe: ${error.message}`);
    }
  }

  async function removeDetectionRule(rule) {
    if (!selectedCamera) return;
    try {
      await api.deleteCameraDetection(selectedCamera.id, rule.id);
      setDetectionRules(await api.getCameraDetections(selectedCamera.id));
    } catch (error) {
      setConsoleError(`Falha ao remover identificacao. Detalhe: ${error.message}`);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      await api.createCamera({ ...form, status: 'offline' });
      await refresh();
      setFeedback({ type: 'success', message: 'Camera cadastrada. O preview aparece na lista ao lado.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `Nao foi possivel cadastrar. Verifique se o backend esta rodando em http://localhost:8000. Detalhe: ${error.message}`,
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCamera(camera) {
    const confirmed = window.confirm(`Excluir a camera "${camera.name}"?`);
    if (!confirmed) return;
    try {
      await api.deleteCamera(camera.id);
      if (selectedCamera?.id === camera.id) {
        setSelectedCamera(null);
        setControls(null);
      }
      await refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: `Nao foi possivel excluir a camera. ${error.message}` });
    }
  }

  return (
    <section className="splitPage">
      <form className="panel formPanel" onSubmit={submit}>
        <div className="panelTitle"><h2>Adicionar camera</h2><Plus size={18} /></div>
        <label>Nome<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Tipo
          <select
            value={form.type}
            onChange={(e) => {
              const type = e.target.value;
              const source = defaultSourceByType[type];
              setForm({ ...form, type, source });
            }}
          >
            <option value="webcam">Webcam</option>
            <option value="video_file">Video local</option>
            <option value="ip_camera">Camera IP na rede</option>
            <option value="rtsp">RTSP</option>
          </select>
        </label>
        <label>Fonte da camera
          <input required value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <small className="fieldHelp">{sourceHelp[form.type]}</small>
        </label>
        <label>Localizacao<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        {feedback.message && <div className={`formFeedback ${feedback.type}`}>{feedback.message}</div>}
        <button className="primaryButton" disabled={saving}>{saving ? 'Cadastrando...' : 'Cadastrar'}</button>
      </form>

      {selectedCamera && controls && (
        <section className="cameraConsole">
          <div className="consoleHeader">
            <div>
              <span className="eyebrow">Operando camera</span>
              <h2>{selectedCamera.name}</h2>
              <small>{selectedCamera.type} | {selectedCamera.source}</small>
            </div>
            <button onClick={() => setSelectedCamera(null)}>Fechar</button>
          </div>

          <img className="consoleStream" src={api.streamUrl(selectedCamera.id, streamVersion)} alt={`Controle de ${selectedCamera.name}`} />

          {consoleError && <div className="formFeedback error">{consoleError}</div>}

          <div className="cameraToolbar">
            <button title="Diminuir zoom" onClick={() => updateControls({ zoom: Math.max(1, controls.zoom - 0.25) })}>
              <ZoomIn size={18} /> {controls.zoom.toFixed(2)}x
            </button>
            <input
              type="range"
              min="1"
              max="4"
              step="0.25"
              value={controls.zoom}
              onChange={(event) => updateControls({ zoom: Number(event.target.value) })}
            />
            <button title="Audio" onClick={() => updateControls({ audio_enabled: !controls.audio_enabled })}>
              {controls.audio_enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              Audio
            </button>
            <button title="Microfone" onClick={() => updateControls({ microphone_enabled: !controls.microphone_enabled })}>
              {controls.microphone_enabled ? <Mic size={18} /> : <MicOff size={18} />}
              Microfone
            </button>
            <button className={controls.recording || controls.recording_requested ? 'recordingButton active' : 'recordingButton'} onClick={toggleRecording}>
              {controls.recording || controls.recording_requested ? <Square size={18} /> : <Video size={18} />}
              {controls.recording || controls.recording_requested ? 'Parar gravacao' : 'Gravar'}
            </button>
            <button title="Recarregar stream" onClick={() => setStreamVersion(Date.now())}>
              Recarregar stream
            </button>
          </div>

          <div className="consoleInfo">
            <span><Radio size={16} /> {controls.last_message}</span>
            {controls.recording_path && <span>Arquivo: {controls.recording_path}</span>}
            {hasActiveDetection ? (
              <span className={detectionStatus?.available ? 'ok' : 'warn'}>{detectionStatus?.message}</span>
            ) : (
              <span>Nenhuma identificacao ativa nesta camera.</span>
            )}
          </div>

          <div className="detectionRulesPanel">
            <div className="panelTitle">
              <h2>Identificacoes desta camera</h2>
              <Tag size={18} />
            </div>
            <form className="inlineForm" onSubmit={addDetectionRule}>
              <label>Marcacao
                <input value={detectionForm.label} onChange={(event) => setDetectionForm({ ...detectionForm, label: event.target.value })} />
              </label>
              <label>Categoria
                <select value={detectionForm.target_class} onChange={(event) => setDetectionForm({ ...detectionForm, target_class: event.target.value })}>
                  <option value="person">Pessoa</option>
                </select>
              </label>
              <button className="primaryButton" type="submit" disabled={savingDetection}>
                {savingDetection ? 'Adicionando...' : 'Adicionar identificacao'}
              </button>
            </form>
            {detectionFeedback && (
              <div className={detectionFeedback.startsWith('Falha') ? 'formFeedback error' : 'formFeedback success'}>
                {detectionFeedback}
              </div>
            )}
            <div className="rulesList">
              {detectionRules.length === 0 && (
                <div className="emptyState">Nenhuma identificacao ativa. Esta camera vai exibir somente o video limpo.</div>
              )}
              {detectionRules.map((rule) => (
                <article key={rule.id} className="ruleItem">
                  <div>
                    <strong>{rule.label}</strong>
                    <span>{rule.target_class === 'person' ? 'Busca pessoas nesta camera' : rule.target_class}</span>
                  </div>
                  <button onClick={() => toggleDetectionRule(rule)}>{rule.active ? 'Ativa' : 'Inativa'}</button>
                  <button title="Remover identificacao" onClick={() => removeDetectionRule(rule)}><Trash2 size={17} /></button>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="cameraGrid full">
        {data.cameras.length === 0 && (
          <div className="emptyState">Nenhuma camera cadastrada. Adicione uma webcam, camera IP, RTSP ou video local para comecar.</div>
        )}
        {data.cameras.map((camera) => <LiveCamera key={camera.id} camera={camera} onOpen={openCamera} onDelete={deleteCamera} />)}
      </div>
    </section>
  );
}
