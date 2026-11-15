import React from 'react';
import { CalendarCheck, CircleAlert, LoaderCircle } from 'lucide-react';
import { useRoutine } from '../hooks/useRoutine.js';

export default function RoutineChecklist({ astronautId }) {
  const {
    data = [],
    error,
    updateError,
    isPending,
    updateItem,
    isUpdating,
  } = useRoutine(astronautId);

  return (
    <section className="panel routine-panel" aria-labelledby="routine-heading">
      <div className="section-heading">
        <h3 id="routine-heading">Mission routine</h3>
        {isUpdating && <LoaderCircle size={16} aria-label="Saving routine" />}
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
              <label>
                <input
                  type="checkbox"
                  checked={item.done}
                  disabled={isUpdating}
                  onChange={(event) => updateItem({ itemId: item.id, done: event.target.checked })}
                />
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
              </label>
              <CalendarCheck size={17} aria-hidden="true" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="routine-message">No routine items are assigned.</p>
      )}
      {updateError && (
        <p className="routine-message warning" role="alert">
          <CircleAlert size={16} /> Could not update this routine item: {updateError.message}
        </p>
      )}
    </section>
  );
}
