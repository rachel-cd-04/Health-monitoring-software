export function routineLaunch(item, crewId) {
  const name = String(item || '').toLowerCase();
  if (name.includes('daily') || name.includes('check-in')) {
    return { crewId, slot: 'daily' };
  }
  if (name.includes('exercise')) {
    return { crewId, slot: 'unscheduled', measurementItemId: 'exercise_min' };
  }
  if (name.includes('sleep') || name.includes('recovery')) {
    return { crewId, slot: 'unscheduled', measurementItemId: 'sleep_hours' };
  }
  return { crewId, slot: 'daily' };
}
