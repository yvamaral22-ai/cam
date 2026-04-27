export default function Reports({ data }) {
  const movement = data.zones.map((zone, index) => ({
    name: zone.name,
    value: 38 + index * 17,
  }));

  return (
    <section className="contentGrid">
      <article className="panel">
        <div className="panelTitle"><h2>Tempo medio por caixa</h2></div>
        <div className="ranking">
          {data.ranking.map((item) => (
            <div className="rankRow" key={item.id}>
              <strong>{item.name}</strong>
              <em>{Math.round(item.avg_seconds)}s</em>
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <div className="panelTitle"><h2>Movimentacao por area</h2></div>
        <div className="horizontalBars">
          {movement.map((item) => (
            <div key={item.name}>
              <span>{item.name}</span>
              <div><i style={{ width: `${Math.min(item.value, 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </article>
      <article className="panel wide">
        <div className="panelTitle"><h2>Resumo operacional</h2></div>
        <div className="reportGrid">
          <strong>{data.alerts.length}</strong><span>alertas registrados</span>
          <strong>{data.zones[0]?.name || 'Sem dados'}</strong><span>area com maior fluxo estimado</span>
          <strong>Futuro</strong><span>exportacao CSV/PDF preparada para proxima etapa</span>
        </div>
      </article>
    </section>
  );
}
