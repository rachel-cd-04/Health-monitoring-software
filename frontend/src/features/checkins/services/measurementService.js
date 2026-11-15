import { api } from '../../../shared/api/apiClient.js';
import {
  GUIDES,
  INDICATORS,
  LOG_ITEMS,
  POINT_REFERENCE_RANGES,
} from '../../health/data/indicators.js';

const measurementIndicators = {
  heart_rate: ['heart_rate'],
  blood_pressure: ['bp_systolic', 'bp_diastolic'],
  blood_sugar: ['blood_sugar'],
  temperature: ['temperature'],
  sleep_hours: ['sleep_hours'],
  mood: ['mood'],
  fatigue: ['fatigue'],
  exercise_min: ['exercise_min'],
};

async function loadBaseline(astronautId, indicator, before) {
  const history = await api(
    `/api/astronauts/${astronautId}/history?indicator=${encodeURIComponent(indicator)}&days=7`,
  );
  const points = (history.points || []).filter((point) => new Date(point.ts).getTime() < before);
  if (points.length < 4) return { status: 'building', count: points.length };

  const mean = points.reduce((sum, point) => sum + Number(point.value), 0) / points.length;
  return { status: 'ready', mean, count: points.length };
}

function buildInterpretation(item, readings, alerts, baselines) {
  const matchingAlert = alerts.find((alert) =>
    readings.some((reading) => reading.indicator === alert.indicator),
  );
  if (matchingAlert) {
    return {
      kind: matchingAlert.level === 'red' ? 'alert' : 'watch',
      title: matchingAlert.message,
      detail:
        'This reading matches an illustrative alert rule. Follow the mission medical procedure.',
      whoActs: matchingAlert.who_acts || [],
      actions: matchingAlert.actions || [],
      alert: matchingAlert,
    };
  }

  const comparisons = readings.flatMap((reading) => {
    const baseline = baselines[reading.indicator];
    if (baseline?.status !== 'ready') return [];
    const indicator = INDICATORS[reading.indicator];
    const difference = reading.value - baseline.mean;
    const direction = difference > 0 ? 'above' : difference < 0 ? 'below' : 'at';
    return [
      `${indicator.label}: ${Math.abs(difference).toLocaleString('en-GB', { maximumFractionDigits: 1 })} ${indicator.unit} ${direction} your recent average (${baseline.mean.toLocaleString('en-GB', { maximumFractionDigits: 1 })} ${indicator.unit}, ${baseline.count} readings).`,
    ];
  });

  const guide = GUIDES[item.guide];
  const referenceComparisons = readings.flatMap((reading) => {
    const reference = POINT_REFERENCE_RANGES[reading.indicator];
    if (!reference) return [];
    const definition = INDICATORS[reading.indicator];
    const value = Number(reading.value);
    const range = `${reference.min}–${reference.max} ${reference.unit}${reference.context ? ` ${reference.context}` : ''}`;
    if (value < reference.min) {
      return [
        `${definition.label}: ${value} ${reference.unit} is below the illustrative guide range (${range}).`,
      ];
    }
    if (value > reference.max) {
      return [
        `${definition.label}: ${value} ${reference.unit} is above the illustrative guide range (${range}).`,
      ];
    }
    return [
      `${definition.label}: ${value} ${reference.unit} is within the illustrative guide range (${range}).`,
    ];
  });
  const outOfGuideRange = readings.some((reading) => {
    const reference = POINT_REFERENCE_RANGES[reading.indicator];
    return reference && (reading.value < reference.min || reading.value > reference.max);
  });
  const heartRateTrendNote = readings.some((reading) => reading.indicator === 'heart_rate')
    ? 'The app’s heart-rate alert checks a 3-day trend above your personal baseline, so one reading does not trigger that rule.'
    : '';
  const historyNote = comparisons.length
    ? comparisons.join(' ')
    : 'A personal trend is not available yet; the app needs at least 4 readings from the last 7 days to compare this value.';

  return {
    kind: outOfGuideRange ? 'watch' : 'reference',
    title: outOfGuideRange ? 'Outside the illustrative guide range' : 'Measurement context',
    detail: [...referenceComparisons, historyNote, heartRateTrendNote].filter(Boolean).join(' '),
    actions: outOfGuideRange ? guide?.abnormal || [] : [],
  };
}

/** Save one selected indicator (blood pressure is a paired indicator) through the health API. */
export async function persistMeasurement({ astronautId, itemId, values }) {
  const item = LOG_ITEMS.find((candidate) => candidate.id === itemId);
  const indicators = measurementIndicators[itemId];
  if (!item || !indicators) throw new Error('Choose a supported health indicator.');

  const timestamp = new Date();
  const readings = indicators.map((indicator, index) => {
    const value = Number(values[item.fields[index]]);
    const definition = INDICATORS[indicator];
    if (
      !Number.isFinite(value) ||
      value < definition.min ||
      value > definition.max ||
      (definition.step === 1 && !Number.isInteger(value))
    ) {
      throw new Error(
        `Enter a valid ${definition.label.toLowerCase()} (${definition.min}–${definition.max} ${definition.unit}).`,
      );
    }
    return { indicator, unit: definition.unit, value };
  });

  if (
    itemId === 'blood_pressure' &&
    readings.find((reading) => reading.indicator === 'bp_diastolic').value >=
      readings.find((reading) => reading.indicator === 'bp_systolic').value
  ) {
    throw new Error('Diastolic pressure must be lower than systolic pressure.');
  }

  const baselines = Object.fromEntries(
    await Promise.all(
      readings.map(async ({ indicator }) => [
        indicator,
        await loadBaseline(astronautId, indicator, timestamp.getTime()).catch(() => ({
          status: 'building',
          count: 0,
        })),
      ]),
    ),
  );
  const results = await Promise.all(
    readings.map((reading) =>
      api('/api/measurements', {
        method: 'POST',
        body: {
          astronaut_id: astronautId,
          ...reading,
          ts: timestamp.toISOString(),
          source: 'manual',
        },
      }),
    ),
  );
  const saved = results.map((result) => result.measurement);
  const alerts = results.flatMap((result) => result.alerts || []);

  return {
    item,
    readings: saved,
    alerts,
    timestamp: timestamp.getTime(),
    interpretation: buildInterpretation(item, readings, alerts, baselines),
  };
}
