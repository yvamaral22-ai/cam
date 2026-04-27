import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Alerts from './pages/Alerts.jsx';
import Cameras from './pages/Cameras.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Occurrences from './pages/Occurrences.jsx';
import Reports from './pages/Reports.jsx';
import Zones from './pages/Zones.jsx';
import { WS_URL, api } from './api/client.js';

const pageTitles = {
  dashboard: 'Centro de Operacoes',
  cameras: 'Cameras',
  zones: 'Zonas Monitoradas',
  alerts: 'Alertas',
  occurrences: 'Ocorrencias',
  reports: 'Relatorios',
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [data, setData] = useState({ cameras: [], zones: [], alerts: [], occurrences: [], watchlist: [], overview: null, ranking: [] });
  const [connected, setConnected] = useState(false);

  async function refresh() {
    const [cameras, zones, alerts, occurrences, watchlist, overview, ranking] = await Promise.all([
      api.getCameras(),
      api.getZones(),
      api.getAlerts(),
      api.getOccurrences(),
      api.getWatchlist(),
      api.getOverview(),
      api.getCashiersRanking(),
    ]);
    setData({ cameras, zones, alerts, occurrences, watchlist, overview, ranking });
  }

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  useEffect(() => {
    const socket = new WebSocket(`${WS_URL}/ws/alerts`);
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.event === 'alert.created') {
        setData((current) => ({ ...current, alerts: [payload.data, ...current.alerts].slice(0, 80) }));
      }
    };
    return () => socket.close();
  }, []);

  const page = useMemo(() => {
    const common = { data, refresh };
    if (activePage === 'cameras') return <Cameras {...common} />;
    if (activePage === 'zones') return <Zones {...common} />;
    if (activePage === 'alerts') return <Alerts {...common} />;
    if (activePage === 'occurrences') return <Occurrences {...common} />;
    if (activePage === 'reports') return <Reports {...common} />;
    return <Dashboard {...common} />;
  }, [activePage, data]);

  return (
    <div className="shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">Inteligencia por video local</span>
            <h1>{pageTitles[activePage]}</h1>
          </div>
          <div className={connected ? 'ws connected' : 'ws'}>{connected ? 'Tempo real ativo' : 'Conectando alertas'}</div>
        </header>
        {page}
      </main>
    </div>
  );
}
