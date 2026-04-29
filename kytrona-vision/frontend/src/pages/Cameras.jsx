import {
  Bell,
  Camera,
  ChevronDown,
  ChevronRight,
  Eye,
  FolderTree,
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  Maximize2,
  Mic,
  MicOff,
  MonitorPlay,
  Plus,
  Radio,
  Save,
  Search,
  Square,
  Star,
  Tag,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const sourceHelp = {
  webcam: 'Use 0 para a webcam principal, 1 para a segunda webcam.',
  video_file: 'Use um caminho local, exemplo: videos/exemplo.mp4',
  ip_camera: 'Use a URL do stream da camera IP na rede.',
  rtsp: 'Use a URL completa RTSP da camera, DVR ou NVR.',
  dss_client: 'Perfil DSS/Dahua por RTSP/TCP usando /cam/realmonitor.',
};

const defaultSourceByType = {
  webcam: '0',
  video_file: 'videos/exemplo.mp4',
  ip_camera: 'http://192.168.0.20:8080/video',
  rtsp: 'rtsp://usuario:senha@ip/stream',
  dss_client: '',
};

const defaultDssForm = {
  host: '',
  port: '9100',
  username: 'admin',
  password: '',
  channel: '1',
  subtype: '1',
};

const layoutOptions = [
  { panes: 1, label: '1', icon: Square },
  { panes: 4, label: '4', icon: Grid2X2 },
  { panes: 9, label: '9', icon: Grid3X3 },
  { panes: 16, label: '16', icon: LayoutGrid },
];

function normalizeHost(host) {
  return host.trim().replace(/^rtsp:\/\//i, '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
}

function buildDssSource(values) {
  const host = normalizeHost(values.host);
  if (!host) return '';
  const port = values.port || '9100';
  const username = values.username.trim();
  const password = values.password;
  const credentials = username
    ? `${encodeURIComponent(username)}${password ? `:${encodeURIComponent(password)}` : ''}@`
    : '';
  const channel = values.channel || '1';
  const subtype = values.subtype || '1';
  return `rtsp://${credentials}${host}:${port}/cam/realmonitor?channel=${channel}&subtype=${subtype}`;
}

function maskSource(source = '') {
  return source.replace(/(rtsp:\/\/)([^:@/]+)(:[^@/]+)?@/i, '$1$2:***@');
}

function defaultCameraForm() {
  return { name: '', type: 'dss_client', source: '', location: '' };
}

function gridColumns(panes) {
  if (panes === 1) return 1;
  if (panes === 4) return 2;
  if (panes === 9) return 3;
  return 4;
}

export default function Cameras({ data, refresh }) {
  const [resourceTab, setResourceTab] = useState('resources');
  const [searchTerm, setSearchTerm] = useState('');
  const [resourcesOpen, setResourcesOpen] = useState(true);
  const [viewMode, setViewMode] = useState('live');
  const [layoutSize, setLayoutSize] = useState(4);
  const [activePane, setActivePane] = useState(0);
  const [paneCameras, setPaneCameras] = useState(Array(4).fill(null));
  const [streamVersion, setStreamVersion] = useState(Date.now());
  const [favorites, setFavorites] = useState([]);
  const [rightPanel, setRightPanel] = useState('add');
  const [form, setForm] = useState(defaultCameraForm());
  const [dssForm, setDssForm] = useState(defaultDssForm);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [controls, setControls] = useState(null);
  const [detectionRules, setDetectionRules] = useState([]);
  const [detectionForm, setDetectionForm] = useState({ label: 'Pessoa', target_class: 'person', active: true });
  const [detectionStatus, setDetectionStatus] = useState(null);
  const [consoleError, setConsoleError] = useState('');
  const [detectionFeedback, setDetectionFeedback] = useState('');
  const [savingDetection, setSavingDetection] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const camerasById = useMemo(() => new Map(data.cameras.map((camera) => [Number(camera.id), camera])), [data.cameras]);
  const zonesByCamera = useMemo(() => {
    return new Map(data.cameras.map((camera) => [
      Number(camera.id),
      data.zones.filter((zone) => Number(zone.camera_id) === Number(camera.id)),
    ]));
  }, [data.cameras, data.zones]);

  const filteredCameras = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const source = resourceTab === 'favorites'
      ? data.cameras.filter((camera) => favorites.includes(Number(camera.id)))
      : data.cameras;
    if (!term) return source;
    return source.filter((camera) => {
      return [camera.name, camera.location, camera.type, camera.source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [data.cameras, favorites, resourceTab, searchTerm]);

  const selectedCameraId = paneCameras[activePane];
  const selectedCamera = selectedCameraId ? camerasById.get(Number(selectedCameraId)) : null;
  const hasActiveDetection = detectionRules.some((rule) => rule.active);

  useEffect(() => {
    api.getDetectionStatus().then(setDetectionStatus).catch(() => {
      setDetectionStatus({ available: false, message: 'Nao foi possivel consultar o status da deteccao.' });
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setPaneCameras((current) => {
      const next = current.slice(0, layoutSize);
      while (next.length < layoutSize) next.push(null);
      return next;
    });
    setActivePane((current) => Math.min(current, layoutSize - 1));
  }, [layoutSize]);

  useEffect(() => {
    setPaneCameras((current) => current.map((cameraId) => (cameraId && camerasById.has(Number(cameraId)) ? cameraId : null)));
  }, [camerasById]);

  useEffect(() => {
    if (!selectedCamera) {
      setControls(null);
      setDetectionRules([]);
      return;
    }
    loadCameraTools(selectedCamera);
  }, [selectedCamera?.id]);

  function updateDssForm(patch) {
    setDssForm((current) => {
      const next = { ...current, ...patch };
      setForm((currentForm) => ({ ...currentForm, source: buildDssSource(next) }));
      return next;
    });
  }

  function assignCamera(camera, paneIndex = activePane) {
    setPaneCameras((current) => {
      const next = [...current];
      const target = next[paneIndex] ? paneIndex : (next.findIndex((cameraId) => !cameraId) === -1 ? paneIndex : next.findIndex((cameraId) => !cameraId));
      next[target] = camera.id;
      setActivePane(target);
      return next;
    });
    setRightPanel('controls');
    setStreamVersion(Date.now());
  }

  async function loadCameraTools(camera) {
    setConsoleError('');
    setDetectionRules([]);
    setDetectionFeedback('');
    setControls({
      zoom: 1,
      audio_enabled: false,
      microphone_enabled: false,
      recording: false,
      recording_requested: false,
      recording_path: null,
      last_message: 'Carregando controles...',
    });
    try {
      const [state, rules] = await Promise.all([
        api.getCameraControls(camera.id),
        api.getCameraDetections(camera.id),
      ]);
      setControls(state);
      setDetectionRules(rules);
    } catch (error) {
      setConsoleError(`Nao foi possivel carregar os controles. ${error.message}`);
    }
  }

  function closePane(index) {
    setPaneCameras((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });
    if (index === activePane) {
      setControls(null);
      setDetectionRules([]);
    }
  }

  function closeAll() {
    setPaneCameras(Array(layoutSize).fill(null));
    setControls(null);
    setDetectionRules([]);
  }

  function openAllVisible() {
    const next = Array(layoutSize).fill(null).map((_, index) => filteredCameras[index]?.id || null);
    setPaneCameras(next);
    setActivePane(0);
    setRightPanel(next[0] ? 'controls' : 'add');
    setStreamVersion(Date.now());
  }

  async function updateControls(payload) {
    if (!selectedCamera) return;
    try {
      const state = await api.updateCameraControls(selectedCamera.id, payload);
      setControls(state);
      setStreamVersion(Date.now());
    } catch (error) {
      setConsoleError(`Falha ao atualizar controles. ${error.message}`);
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
      setConsoleError(`Falha ao controlar gravacao. ${error.message}`);
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
      setDetectionFeedback('Identificacao adicionada.');
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
      setStreamVersion(Date.now());
    } catch (error) {
      setConsoleError(`Falha ao alterar identificacao. ${error.message}`);
    }
  }

  async function removeDetectionRule(rule) {
    if (!selectedCamera) return;
    try {
      await api.deleteCameraDetection(selectedCamera.id, rule.id);
      setDetectionRules(await api.getCameraDetections(selectedCamera.id));
      setStreamVersion(Date.now());
    } catch (error) {
      setConsoleError(`Falha ao remover identificacao. ${error.message}`);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const created = await api.createCamera({ ...form, status: 'offline' });
      await refresh();
      setFeedback({ type: 'success', message: 'Camera cadastrada nos recursos.' });
      setForm(defaultCameraForm());
      setDssForm(defaultDssForm);
      assignCamera(created);
    } catch (error) {
      setFeedback({ type: 'error', message: `Nao foi possivel cadastrar. ${error.message}` });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCamera(camera) {
    const confirmed = window.confirm(`Excluir a camera "${camera.name}"?`);
    if (!confirmed) return;
    try {
      await api.deleteCamera(camera.id);
      setPaneCameras((current) => current.map((cameraId) => (Number(cameraId) === Number(camera.id) ? null : cameraId)));
      if (Number(selectedCamera?.id) === Number(camera.id)) {
        setControls(null);
        setDetectionRules([]);
        setRightPanel('add');
      }
      await refresh();
      setFeedback({ type: 'success', message: 'Camera removida.' });
    } catch (error) {
      setFeedback({ type: 'error', message: `Nao foi possivel excluir. ${error.message}` });
    }
  }

  function toggleFavorite(cameraId) {
    setFavorites((current) => {
      const id = Number(cameraId);
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  }

  const columns = gridColumns(layoutSize);

  return (
    <section className="monitorPage">
      <aside className="monitorRail">
        <div className="monitorBrand">
          <Camera size={26} />
          <div>
            <strong>DSS Monitor</strong>
            <span>{data.cameras.length} cameras hospedadas</span>
          </div>
        </div>

        <div className="resourceTabs">
          <button className={resourceTab === 'resources' ? 'active' : ''} onClick={() => setResourceTab('resources')}>Recursos</button>
          <button className={resourceTab === 'favorites' ? 'active' : ''} onClick={() => setResourceTab('favorites')}>Favoritos</button>
        </div>

        <label className="resourceSearch">
          <Search size={18} />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Pesq...." />
        </label>

        <div className="resourceTree">
          <button className="treeRoot" onClick={() => setResourcesOpen(!resourcesOpen)}>
            {resourcesOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
            <FolderTree size={18} />
            <span>Local atual ({filteredCameras.length}/{data.cameras.length})</span>
          </button>

          {resourcesOpen && (
            <div className="cameraResourceList">
              {filteredCameras.length === 0 && <div className="monitorEmpty">Nenhuma camera encontrada.</div>}
              {filteredCameras.map((camera) => {
                const zoneCount = zonesByCamera.get(Number(camera.id))?.length || 0;
                const active = paneCameras.includes(camera.id);
                return (
                  <article key={camera.id} className={active ? 'cameraResource active' : 'cameraResource'}>
                    <button className="cameraResourceMain" onClick={() => assignCamera(camera)}>
                      <Video size={17} />
                      <span>{camera.name}</span>
                      <small>{camera.location || camera.type} | {zoneCount} zonas</small>
                    </button>
                    <button className={favorites.includes(Number(camera.id)) ? 'favorite active' : 'favorite'} onClick={() => toggleFavorite(camera.id)} title="Favorito">
                      <Star size={16} />
                    </button>
                    <button className="resourceDelete" onClick={() => deleteCamera(camera)} title="Excluir camera">
                      <Trash2 size={16} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="monitorAccordion">
          <button><Eye size={17} /> Ver <ChevronRight size={16} /></button>
          <button><Bell size={17} /> Alarmes <ChevronRight size={16} /></button>
          <button><ZoomIn size={17} /> PTZ <ChevronRight size={16} /></button>
        </div>
      </aside>

      <main className="monitorStage">
        <header className="monitorTopbar">
          <div className="modeTabs">
            <button className={viewMode === 'live' ? 'active' : ''} onClick={() => setViewMode('live')}>Vis. ao vivo</button>
            <button className={viewMode === 'replay' ? 'active' : ''} onClick={() => setViewMode('replay')}>Rep.</button>
          </div>
          <div className="monitorClock">
            <Radio size={17} />
            <span>{currentTime.toLocaleTimeString('pt-BR')}</span>
          </div>
        </header>

        <div className="monitorToolbar">
          <div className="layoutButtons">
            {layoutOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button key={option.panes} className={layoutSize === option.panes ? 'active' : ''} onClick={() => setLayoutSize(option.panes)} title={`${option.panes} quadros`}>
                  <Icon size={19} />
                </button>
              );
            })}
          </div>
          <div className="monitorActions">
            <button onClick={openAllVisible}>Abrir visiveis</button>
            <button onClick={() => setStreamVersion(Date.now())}>Recarregar</button>
            <button onClick={closeAll}>Fechar tudo</button>
            <button onClick={() => setRightPanel('add')}><Plus size={17} /> Camera</button>
          </div>
        </div>

        <section className={`videoWall videoWall${layoutSize}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {paneCameras.map((cameraId, index) => {
            const camera = cameraId ? camerasById.get(Number(cameraId)) : null;
            return (
              <article key={`${index}-${cameraId || 'empty'}`} className={activePane === index ? 'videoPane active' : 'videoPane'} onClick={() => setActivePane(index)}>
                <div className="paneHeader">
                  <span>{index + 1}</span>
                  <strong>{camera?.name || 'Sem camera'}</strong>
                  {camera && <button onClick={(event) => { event.stopPropagation(); closePane(index); }} title="Fechar"><X size={15} /></button>}
                </div>

                {camera && viewMode === 'live' && (
                  <img className="paneStream" src={api.streamUrl(camera.id, `${streamVersion}-${index}`)} alt={`Stream de ${camera.name}`} />
                )}

                {camera && viewMode === 'replay' && (
                  <div className="panePlaceholder">
                    <MonitorPlay size={36} />
                    <strong>Reproducao</strong>
                    <span>{camera.name}</span>
                  </div>
                )}

                {!camera && (
                  <div className="panePlaceholder">
                    <Video size={36} />
                    <strong>Canal livre</strong>
                    <span>Selecione uma camera nos recursos</span>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>

      <aside className="monitorInspector">
        <div className="inspectorTabs">
          <button className={rightPanel === 'controls' ? 'active' : ''} onClick={() => setRightPanel('controls')}>Monitor</button>
          <button className={rightPanel === 'add' ? 'active' : ''} onClick={() => setRightPanel('add')}>Cadastro</button>
        </div>

        {rightPanel === 'add' && (
          <form className="monitorForm" onSubmit={submit}>
            <div className="inspectorTitle">
              <h2>Adicionar camera</h2>
              <Plus size={18} />
            </div>
            <label>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Tipo
              <select
                value={form.type}
                onChange={(event) => {
                  const type = event.target.value;
                  const source = type === 'dss_client' ? buildDssSource(dssForm) : defaultSourceByType[type];
                  setForm({ ...form, type, source });
                }}
              >
                <option value="dss_client">DSS Client / Dahua</option>
                <option value="rtsp">RTSP</option>
                <option value="ip_camera">Camera IP na rede</option>
                <option value="webcam">Webcam</option>
                <option value="video_file">Video local</option>
              </select>
            </label>

            {form.type === 'dss_client' && (
              <div className="dssFields monitorDssFields">
                <label>Servidor/IP<input required value={dssForm.host} onChange={(event) => updateDssForm({ host: event.target.value })} placeholder="192.168.0.10" /></label>
                <label>Porta
                  <select value={dssForm.port} onChange={(event) => updateDssForm({ port: event.target.value })}>
                    <option value="9100">9100 DSS</option>
                    <option value="554">554 DVR/NVR</option>
                  </select>
                </label>
                <label>Usuario<input value={dssForm.username} onChange={(event) => updateDssForm({ username: event.target.value })} /></label>
                <label>Senha<input type="password" value={dssForm.password} onChange={(event) => updateDssForm({ password: event.target.value })} /></label>
                <label>Canal<input type="number" min="1" value={dssForm.channel} onChange={(event) => updateDssForm({ channel: event.target.value })} /></label>
                <label>Stream
                  <select value={dssForm.subtype} onChange={(event) => updateDssForm({ subtype: event.target.value })}>
                    <option value="1">Extra/Substream</option>
                    <option value="0">Principal</option>
                  </select>
                </label>
              </div>
            )}

            <label>Fonte
              <input required readOnly={form.type === 'dss_client'} value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} />
              <small className="fieldHelp">{sourceHelp[form.type]}</small>
            </label>
            <label>Localizacao<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
            {feedback.message && <div className={`formFeedback ${feedback.type}`}>{feedback.message}</div>}
            <button className="primaryButton" disabled={saving}><Save size={17} /> {saving ? 'Cadastrando...' : 'Hospedar camera'}</button>
          </form>
        )}

        {rightPanel === 'controls' && (
          <section className="monitorControls">
            {!selectedCamera && <div className="monitorEmpty">Selecione um quadro com camera.</div>}
            {selectedCamera && (
              <>
                <div className="inspectorTitle">
                  <div>
                    <h2>{selectedCamera.name}</h2>
                    <span>{maskSource(selectedCamera.source)}</span>
                  </div>
                  <button title="Tela cheia"><Maximize2 size={18} /></button>
                </div>

                {consoleError && <div className="formFeedback error">{consoleError}</div>}

                <div className="controlCluster">
                  <button onClick={() => updateControls({ zoom: Math.max(1, (controls?.zoom || 1) - 0.25) })}><ZoomIn size={17} /> -</button>
                  <strong>{(controls?.zoom || 1).toFixed(2)}x</strong>
                  <button onClick={() => updateControls({ zoom: Math.min(4, (controls?.zoom || 1) + 0.25) })}><ZoomIn size={17} /> +</button>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.25"
                  value={controls?.zoom || 1}
                  onChange={(event) => updateControls({ zoom: Number(event.target.value) })}
                />

                <div className="monitorButtonGrid">
                  <button onClick={() => updateControls({ audio_enabled: !controls?.audio_enabled })}>
                    {controls?.audio_enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
                    Audio
                  </button>
                  <button onClick={() => updateControls({ microphone_enabled: !controls?.microphone_enabled })}>
                    {controls?.microphone_enabled ? <Mic size={17} /> : <MicOff size={17} />}
                    Microfone
                  </button>
                  <button className={controls?.recording || controls?.recording_requested ? 'activeDanger' : ''} onClick={toggleRecording}>
                    {controls?.recording || controls?.recording_requested ? <Square size={17} /> : <Video size={17} />}
                    {controls?.recording || controls?.recording_requested ? 'Parar' : 'Gravar'}
                  </button>
                  <button onClick={() => setStreamVersion(Date.now())}><Radio size={17} /> Recarregar</button>
                </div>

                <div className="consoleInfo monitorInfo">
                  <span><Radio size={16} /> {controls?.last_message || 'Pronto'}</span>
                  {controls?.recording_path && <span>Arquivo: {controls.recording_path}</span>}
                  {hasActiveDetection ? (
                    <span className={detectionStatus?.available ? 'ok' : 'warn'}>{detectionStatus?.message}</span>
                  ) : (
                    <span>Nenhuma identificacao ativa.</span>
                  )}
                </div>

                <form className="monitorDetectionForm" onSubmit={addDetectionRule}>
                  <div className="inspectorTitle small">
                    <h2>Identificacoes</h2>
                    <Tag size={17} />
                  </div>
                  <label>Marcacao<input value={detectionForm.label} onChange={(event) => setDetectionForm({ ...detectionForm, label: event.target.value })} /></label>
                  <button className="primaryButton" disabled={savingDetection}>{savingDetection ? 'Adicionando...' : 'Adicionar identificacao'}</button>
                </form>

                {detectionFeedback && <div className={detectionFeedback.startsWith('Falha') ? 'formFeedback error' : 'formFeedback success'}>{detectionFeedback}</div>}

                <div className="monitorRules">
                  {detectionRules.length === 0 && <div className="monitorEmpty">Nenhuma regra nesta camera.</div>}
                  {detectionRules.map((rule) => (
                    <article key={rule.id}>
                      <div>
                        <strong>{rule.label}</strong>
                        <span>{rule.active ? 'Ativa' : 'Inativa'}</span>
                      </div>
                      <button onClick={() => toggleDetectionRule(rule)}>{rule.active ? 'Pausar' : 'Ativar'}</button>
                      <button onClick={() => removeDetectionRule(rule)}><Trash2 size={16} /></button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </aside>
    </section>
  );
}
