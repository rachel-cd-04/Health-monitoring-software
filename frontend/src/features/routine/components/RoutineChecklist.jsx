import React from 'react';
import { CalendarCheck, CircleAlert } from 'lucide-react';
import { useRoutine } from '../hooks/useRoutine.js';

export default function RoutineChecklist({ astronautId, crewId, environment, onStart }) {
  const { data = [], error, isPending } = useRoutine(astronautId, environment);

  return (
    <section className="panel routine-panel" aria-labelledby="routine-heading">
      <div className="section-heading">
        <h3 id="routine-heading">Mission routine</h3>
      </div>
      {isPending ? (
        <p className="routine-message">Loading routine…</p>
      ) : error ? (
        <p className="routine-message warning">
          <CircleAlert size={16} /> Could not load the mission routine: {error.message}
        </p>
      ) : data.length ? (
        <ul className="routine-list">
          {data.map((item) => (
            <li key={item.id} className={item.overdue ? 'overdue' : ''}>
              <div className="routine-item-content">
                <span>
                  <b>{item.item}</b>
                  <small>
                    {item.overdue ? 'Overdue · ' : ''}
                    Due{' '}
                    {new Date(item.due_at).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'UTC',
                    })}{' '}
                    UTC
                  </small>
                </span>
                {item.done ? (
                  <span className="routine-complete">Completed today</span>
                ) : (
                  <button
                    className="button primary small"
                    onClick={() => onStart(item.item, crewId)}
                  >
                    Start
                  </button>
                )}
              </div>
              {!item.done && <CalendarCheck size={17} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="routine-message">No routine items are assigned.</p>
      )}
    </section>
  );
}
