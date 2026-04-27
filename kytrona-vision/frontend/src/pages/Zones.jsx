import { Camera, Eye, MapPinned, Pencil, Save, ShieldAlert, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const zoneTypes = [
  { value: 'caixa', label: 'Caixa' },
  { value: 'corredor', label: 'Corredor' },
  { value: 'estoque', label: 'Estoque' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'area_restrita', label: 'Area restrita' },
];

const coordFields = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'w', label: 'Largura' },
  { key: 'h', label: 'Altura' },
];

function defaultForm(cameraId = '') {
  return {
    name: 'Nova Zona',
    camera_id: cameraId,
    type: 'corredor',
    coordinates: { x: 20, y: 20, w: 30, h: 30, unit: 'percent' },
    time_limit_seconds: 180,
    people_limit: 4,
    schedule_start: '08:00',
    schedule_end: '18:00',
    active: true,
  };
}

function cameraLabel(camera) {
  if (!camera) return 'Camera removida';
  return camera.location ? `${camera.name} - ${camera.location}` : camera.name;
}

function zonePayload(form) {
  return {
    ...form,
    camera_id: Number(form.camera_id),
    time_limit_seconds: Number(form.time_limit_seconds),
    people_limit: Number(form.people_limit),
    coordinates: {
      x: Number(form.coordinates.x),
      y: Number(form.coordinates.y),
      w: Number(form.coordinates.w),
      h: Number(form.coordinates.h),
      unit: form.coordinates.unit || 'percent',
    },
    active: Boolean(form.active),
  };
}

export default function Zones({ data, refresh }) {
  const firstCameraId = data.cameras[0]?.id || '';
  const [form, setForm] = useState(defaultForm(firstCameraId));
  const [editingId, setEditingId] = useState(null);
  const [cameraFilter, setCameraFilter] = useState('');
  const [previewZone, setPreviewZone] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const camerasById = useMemo(() => {
    return new Map(data.cameras.map((camera) => [Number(camera.id), camera]));
  }, [data.cameras]);

  const zonesByCamera = useMemo(() => {
    const groups = data.cameras.map((camera) => ({
      camera,
      zones: data.zones.filter((zone) => Number(zone.camera_id) === Number(camera.id)),
    }));
    const orphanZones = data.zones.filter((zone) => !camerasById.has(Number(zone.camera_id)));
    if (orphanZones.length) {
      groups.push({
        camera: { id: 'missing', name: 'Camera removida', status: 'offline', location: 'Revise o vinculo destas zonas' },
        zones: orphanZones,
      });
    }
    return cameraFilter
      ? groups.filter((group) => String(group.camera.id) === String(cameraFilter))
      : groups;
  }, [cameraFilter, camerasById, data.cameras, data.zones]);

  useEffect(() => {
    if (!form.camera_id && firstCameraId) {
      setForm((current) => ({ ...current, camera_id: firstCameraId }));
    }
  }, [firstCameraId, form.camera_id]);

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm(firstCameraId));
    setFeedback('');
  }

  function editZone(zone) {
    setEditingId(zone.id);
    setPreviewZone(zone);
    setFeedback('');
    setForm({
      name: zone.name,
      camera_id: zone.camera_id,
      type: zone.type,
      coordinates: {
        x: zone.coordinates?.x ?? 20,
        y: zone.coordinates?.y ?? 20,
        w: zone.coordinates?.w ?? 30,
        h: zone.coordinates?.h ?? 30,
        unit: zone.coordinates?.unit || 'percent',
      },
      time_limit_seconds: zone.time_limit_seconds,
      people_limit: zone.people_limit,
      schedule_start: zone.schedule_start,
      schedule_end: zone.schedule_end,
      active: Boolean(zone.active),
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!data.cameras.length) {
      setFeedback('Cadastre uma camera antes de criar zonas.');
      return;
    }
    setSaving(true);
    setFeedback(editingId ? 'Atualizando zona...' : 'Criando zona...');
    try {
      const payload = zonePayload(form);
      const saved = editingId
        ? await api.updateZone(editingId, payload)
        : await api.createZone(payload);
      setPreviewZone(saved);
      await refresh();
      setFeedback(editingId ? 'Zona atualizada.' : 'Zona cadastrada.');
      if (!editingId) setForm(defaultForm(firstCameraId));
    } catch (error) {
      setFeedback(`Nao foi possivel salvar a zona. ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function moveZone(zone, cameraId) {
    try {
      const saved = await api.updateZone(zone.id, { camera_id: Number(cameraId) });
      setPreviewZone((current) => (current?.id === zone.id ? saved : current));
      await refresh();
    } catch (error) {
      setFeedback(`Nao foi possivel trocar a camera da zona. ${error.message}`);
    }
  }

  async function toggleZone(zone) {
    try {
      const saved = await api.updateZone(zone.id, { active: !zone.active });
      setPreviewZone((current) => (current?.id === zone.id ? saved : current));
      await refresh();
    } catch (error) {
      setFeedback(`Nao foi possivel alterar o status da zona. ${error.message}`);
    }
  }

  async function deleteZone(zone) {
    const confirmed = window.confirm(`Excluir a zona "${zone.name}"?`);
    if (!confirmed) return;
    try {
      await api.deleteZone(zone.id);
      if (previewZone?.id === zone.id) setPreviewZone(null);
      if (editingId === zone.id) resetForm();
      await refresh();
    } catch (error) {
      setFeedback(`Nao foi possivel excluir a zona. ${error.message}`);
    }
  }

  const previewCamera = previewZone ? camerasById.get(Number(previewZone.camera_id)) : null;
  const activeZones = data.zones.filter((zone) => zone.active).length;

  return (
    <section className="zonesPage">
      <form className="panel formPanel zoneEditor" onSubmit={submit}>
        <div className="panelTitle">
          <h2>{editingId ? 'Editar zona' : 'Nova zona'}</h2>
          {editingId ? <Pencil size={18} /> : <ShieldAlert size={18} />}
        </div>

        <label>Nome<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Camera da zona
          <select required value={form.camera_id} onChange={(e) => setForm({ ...form, camera_id: e.target.value })}>
            <option value="" disabled>Selecione uma camera</option>
            {data.cameras.map((camera) => <option value={camera.id} key={camera.id}>{cameraLabel(camera)}</option>)}
          </select>
        </label>
        <label>Tipo
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {zoneTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
          </select>
        </label>

        <div className="zoneEditorGrid">
          <label>Limite permanencia<input type="number" min="1" value={form.time_limit_seconds} onChange={(e) => setForm({ ...form, time_limit_seconds: e.target.value })} /></label>
          <label>Limite pessoas<input type="number" min="1" value={form.people_limit} onChange={(e) => setForm({ ...form, people_limit: e.target.value })} /></label>
          <label>Inicio<input type="time" value={form.schedule_start} onChange={(e) => setForm({ ...form, schedule_start: e.target.value })} /></label>
          <label>Fim<input type="time" value={form.schedule_end} onChange={(e) => setForm({ ...form, schedule_end: e.target.value })} /></label>
        </div>

        <div className="coordinatePanel">
          <div className="inlineTitle"><SlidersHorizontal size={17} /><strong>Area da zona (%)</strong></div>
          <div className="coordinateGrid">
            {coordFields.map((field) => (
              <label key={field.key}>{field.label}
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.coordinates[field.key]}
                  onChange={(event) => setForm({
                    ...form,
                    coordinates: { ...form.coordinates, [field.key]: event.target.value },
                  })}
                />
              </label>
            ))}
          </div>
        </div>

        <label className="toggleRow">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          <span>Zona ativa</span>
        </label>

        {feedback && <div className={feedback.startsWith('Nao') ? 'formFeedback error' : 'formFeedback success'}>{feedback}</div>}

        <div className="formActions">
          <button className="primaryButton" disabled={saving || !data.cameras.length} type="submit">
            <Save size={17} /> {saving ? 'Salvando...' : editingId ? 'Salvar ajustes' : 'Cadastrar zona'}
          </button>
          {editingId && <button className="secondaryButton" type="button" onClick={resetForm}><X size={17} /> Cancelar</button>}
        </div>
      </form>

      <div className="zoneWorkspace">
        <section className="panel zoneOverview">
          <div>
            <span className="eyebrow">Organizacao</span>
            <h2>{data.zones.length} zonas, {activeZones} ativas</h2>
          </div>
          <select value={cameraFilter} onChange={(e) => setCameraFilter(e.target.value)}>
            <option value="">Todas as cameras</option>
            {data.cameras.map((camera) => <option value={camera.id} key={camera.id}>{camera.name}</option>)}
          </select>
        </section>

        {previewZone && previewCamera && (
          <section className="panel zonePreview">
            <div className="zonePreviewCopy">
              <span className="eyebrow">Camera da zona</span>
              <h2>{previewZone.name}</h2>
              <small>{cameraLabel(previewCamera)}</small>
            </div>
            <img className="zonePreviewStream" src={api.streamUrl(previewCamera.id, `zone-${previewZone.id}`)} alt={`Camera vinculada a ${previewZone.name}`} />
          </section>
        )}

        <div className="zoneBoard">
          {data.cameras.length === 0 && (
            <div className="emptyState">Cadastre uma camera antes de organizar zonas.</div>
          )}

          {zonesByCamera.map((group) => (
            <section className="zoneGroup" key={group.camera.id}>
              <div className="zoneGroupHeader">
                <div>
                  <strong><Camera size={17} /> {group.camera.name}</strong>
                  <span>{group.camera.location || 'Sem localizacao'} | {group.camera.status}</span>
                </div>
                <em>{group.zones.length} zonas</em>
              </div>

              <div className="zoneList">
                {group.zones.length === 0 && <div className="emptyState">Nenhuma zona vinculada a esta camera.</div>}
                {group.zones.map((zone) => {
                  const camera = camerasById.get(Number(zone.camera_id));
                  return (
                    <article key={zone.id} className={previewZone?.id === zone.id ? 'zoneItem selected' : 'zoneItem'}>
                      <div className="zoneItemHeader">
                        <div>
                          <strong>{zone.name}</strong>
                          <span>{zoneTypes.find((type) => type.value === zone.type)?.label || zone.type}</span>
                        </div>
                        <button className={zone.active ? 'statusButton active' : 'statusButton'} onClick={() => toggleZone(zone)}>
                          {zone.active ? 'Ativa' : 'Inativa'}
                        </button>
                      </div>

                      <div className="zoneMeta">
                        <span><MapPinned size={15} /> {cameraLabel(camera)}</span>
                        <small>{zone.schedule_start} ate {zone.schedule_end} | {zone.people_limit} pessoas | {zone.time_limit_seconds}s</small>
                      </div>

                      <label className="compactSelect">Camera vinculada
                        <select value={zone.camera_id} onChange={(event) => moveZone(zone, event.target.value)}>
                          {data.cameras.map((cameraOption) => (
                            <option value={cameraOption.id} key={cameraOption.id}>{cameraLabel(cameraOption)}</option>
                          ))}
                        </select>
                      </label>

                      <div className="zoneActions">
                        <button className="secondaryButton" onClick={() => setPreviewZone(zone)}><Eye size={17} /> Ver camera</button>
                        <button className="secondaryButton" onClick={() => editZone(zone)}><Pencil size={17} /> Editar</button>
                        <button className="dangerIconButton" title="Excluir zona" onClick={() => deleteZone(zone)}><Trash2 size={17} /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
