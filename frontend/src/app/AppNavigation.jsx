import React from 'react';
import { Activity, BellRing, Settings } from 'lucide-react';
import { navigationItems } from './navigation.js';

export default function AppNavigation({
  view,
  navigate,
  data,
  setSettings,
  openEmergency,
  detail,
}) {
  return (
    <aside className="rail" aria-label="Main navigation">
      <button className="rail-brand" onClick={() => navigate('crew')} aria-label="SOMA home">
        <Activity size={22} />
      </button>
      <nav>
        {navigationItems.map(([id, label, Icon]) => (
          <button
            key={id}
            aria-label={label}
            aria-current={view === id ? 'page' : undefined}
            className={'rail-item ' + (view === id ? 'selected' : '')}
            onClick={() => navigate(id)}
          >
            <Icon size={21} />
            <span>{label}</span>
            {id === 'medical' && data.messages.some((message) => message.status === 'pending') && (
              <b className="nav-count">
                {data.messages.filter((message) => message.status === 'pending').length}
              </b>
            )}
          </button>
        ))}
      </nav>
      <div className="rail-bottom">
        <button
          className="rail-item"
          aria-label="Mission settings"
          onClick={() => setSettings(true)}
        >
          <Settings size={21} />
          <span>Settings</span>
        </button>
        <button className="rail-alert" aria-label="Emergency" onClick={() => openEmergency(detail)}>
          <BellRing size={21} />
          <span>Emergency</span>
        </button>
      </div>
    </aside>
  );
}
