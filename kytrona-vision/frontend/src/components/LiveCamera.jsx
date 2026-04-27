import { api } from '../api/client';

export default function LiveCamera({ camera }) {
  return (
    <article className="liveCard">
      <div className="liveHeader">
        <div>
          <strong>{camera.name}</strong>
          <span>{camera.location || 'Sem localizacao'}</span>
        </div>
        <em className={camera.status === 'online' ? 'online' : 'offline'}>{camera.status}</em>
      </div>
      <img className="stream" src={api.streamUrl(camera.id)} alt={`Stream processado de ${camera.name}`} />
    </article>
  );
}
