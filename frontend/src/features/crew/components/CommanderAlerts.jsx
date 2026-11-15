import React from 'react';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { useCrewAlerts } from '../hooks/useCrewAlerts.js';

export default function CommanderAlerts({ enabled }) {
  const { data = [], error, isPending } = useCrewAlerts(enabled);
  if (!enabled) return null;

  return (
    <section className="panel commander-alerts" aria-labelledby="commander-alerts-heading">
      <div className="section-heading">
        <h3 id="commander-alerts-heading">Crew alerts</h3>
        {isPending && <LoaderCircle size={16} aria-label="Loading crew alerts" />}
      </div>
      {error ? (
        <p className="routine-message warning">Could not load crew alerts: {error.message}</p>
      ) : data.length ? (
        <ul>
          {data.map((alert, index) => (
            <li key={`${alert.astronaut_id}-${alert.ts}-${index}`}>
              <AlertTriangle size={17} aria-hidden="true" />
              <span>
                <b>{alert.name}</b>
                <small>
                  {alert.level} · {alert.title}
                </small>
              </span>
              <time dateTime={alert.ts}>
                {new Date(alert.ts).toLocaleString([], { timeZone: 'UTC' })} UTC
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="routine-message">No active alerts for other crew members.</p>
      )}
      <p className="page-note">
        Only alert levels and titles are shown. Health values stay private.
      </p>
    </section>
  );
}
