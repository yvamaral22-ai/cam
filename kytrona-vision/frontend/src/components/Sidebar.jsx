import { AlertTriangle, BarChart3, Camera, ClipboardList, LayoutDashboard, Map, ShieldCheck } from 'lucide-react';

const items = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'cameras', label: 'Cameras', icon: Camera },
  { page: 'zones', label: 'Zonas', icon: Map },
  { page: 'alerts', label: 'Alertas', icon: AlertTriangle },
  { page: 'occurrences', label: 'Ocorrencias', icon: ClipboardList },
  { page: 'reports', label: 'Relatorios', icon: BarChart3 },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark"><ShieldCheck size={22} /></div>
        <div>
          <strong>KYTRONA</strong>
          <span>VISION</span>
        </div>
      </div>
      <nav className="nav">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              className={activePage === item.page ? 'navItem active' : 'navItem'}
              onClick={() => onNavigate(item.page)}
              title={item.label}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
