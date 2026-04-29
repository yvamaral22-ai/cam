import { Radio, Trash2, Video } from 'lucide-react';

export default function LiveCamera({ camera, onOpen, onDelete, zoneCount }) {
  return (
    <article className="liveCard">
      <div className="liveHeader">
        <div>
          <strong>{camera.name}</strong>
          <span>{camera.location || 'Sem localizacao'}</span>
          {typeof zoneCount === 'number' && <small>{zoneCount} zonas vinculadas</small>}
        </div>
        <em className={camera.status === 'online' ? 'online' : 'offline'}>{camera.status}</em>
      </div>
      <div className="streamPlaceholder">
        <Video size={30} />
        <strong>Preview pausado</strong>
        <span><Radio size={15} /> Abra a camera para iniciar o stream</span>
      </div>
      {(onOpen || onDelete) && (
        <div className="cardActions">
          {onOpen && <button className="operateButton" onClick={() => onOpen(camera)}>Operar camera</button>}
          {onDelete && (
            <button className="deleteButton" title="Excluir camera" onClick={() => onDelete(camera)}>
              <Trash2 size={17} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
