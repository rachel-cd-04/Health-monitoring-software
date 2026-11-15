import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import { metrics, stamp, dateLabel, number } from '../../crew/models/crewModel.js';

export default React.memo(function SampleChart({
  records,
  crewId,
  metric = 'pulse',
  days = 7,
  slot = 'all',
  large = false,
  baseline = null,
  diastolicBaseline = null,
  alertMarkers = [],
  events = [],
}) {
  const points = useMemo(
    () =>
      records
        .filter(
          (r) =>
            r.crewId === crewId &&
            r.metric === metric &&
            r.time >= Date.now() - days * 86400000 &&
            (slot === 'all' ||
              (slot === 'daily'
                ? ['daily', 'morning', 'evening'].includes(r.slot)
                : r.slot === slot)),
        )
        .sort((a, b) => a.time - b.time)
        .map((r) => ({
          ...r,
          label: `${dateLabel(r.time)} ${r.slot === 'unscheduled' ? '+' : ''}`,
        })),
    [records, crewId, metric, days, slot],
  );
  const m = metrics[metric];
  const visibleAlerts = alertMarkers.flatMap((marker) => {
    const markerTime = new Date(marker.ts ?? marker.time).getTime();
    if (!Number.isFinite(markerTime) || markerTime < Date.now() - days * 86400000) return [];
    const markerDay = new Date(markerTime).toISOString().slice(0, 10);
    const point = points
      .filter((candidate) => new Date(candidate.time).toISOString().slice(0, 10) === markerDay)
      .sort(
        (left, right) => Math.abs(left.time - markerTime) - Math.abs(right.time - markerTime),
      )[0];
    const value = Number(marker.value ?? point?.value);
    if (!Number.isFinite(value)) return [];
    return [{ ...marker, time: point?.time ?? markerTime, value }];
  });
  const visibleEvents = events.filter((event) => {
    const timestamp = new Date(event.ts ?? event.time).getTime();
    return Number.isFinite(timestamp) && timestamp >= Date.now() - days * 86400000;
  });
  return (
    <div
      className={'sample-chart ' + (large ? 'large' : '')}
      role="img"
      aria-label={`${m.label}: ${points.length} saved samples over ${days} days. Not a live signal.`}
    >
      {points.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 20, right: 20, left: -12, bottom: 10 }}>
            <CartesianGrid stroke="#e3eaee" strokeDasharray="3 6" vertical={false} />
            {baseline?.low != null && baseline?.high != null && (
              <ReferenceArea
                y1={baseline.low}
                y2={baseline.high}
                fill="#4b4fc4"
                fillOpacity={0.09}
                strokeOpacity={0}
                ifOverflow="hidden"
              />
            )}
            {metric === 'bp' &&
              diastolicBaseline?.low != null &&
              diastolicBaseline?.high != null && (
                <ReferenceArea
                  y1={diastolicBaseline.low}
                  y2={diastolicBaseline.high}
                  fill="#9b87b3"
                  fillOpacity={0.1}
                  strokeOpacity={0}
                  ifOverflow="hidden"
                />
              )}
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={dateLabel}
              minTickGap={48}
              tick={{ fontSize: 12, fill: '#7791a1' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={metric === 'mood' ? [1, 5] : ['auto', 'auto']}
              tick={{ fontSize: 12, fill: '#7791a1' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={stamp}
              formatter={(v, key) => [
                `${number(v)} ${m.unit}`,
                metric === 'bp' ? (key === 'value' ? 'Systolic' : 'Diastolic') : m.label,
              ]}
              contentStyle={{
                background: '#fff',
                border: '1px solid #d5e2e9',
                borderRadius: 9,
                color: '#3c5d6e',
                fontSize: 12,
              }}
            />
            <Line
              type="linear"
              dataKey="value"
              name={metric === 'bp' ? 'Systolic' : m.label}
              stroke="#16707d"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            {metric === 'bp' && (
              <Line
                type="linear"
                dataKey="diastolic"
                name="Diastolic"
                stroke="#9b87b3"
                strokeWidth={2}
                dot={{ r: 3, fill: '#fff' }}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            {baseline?.mean != null && (
              <ReferenceLine
                y={baseline.mean}
                stroke="#4b4fc4"
                strokeDasharray="5 5"
                label={{
                  value: metric === 'bp' ? 'Systolic baseline' : 'Personal baseline',
                  position: 'insideTopLeft',
                  fill: '#3f43b0',
                  fontSize: 12,
                }}
              />
            )}
            {metric === 'bp' && diastolicBaseline?.mean != null && (
              <ReferenceLine
                y={diastolicBaseline.mean}
                stroke="#9b87b3"
                strokeDasharray="4 5"
                label={{
                  value: 'Diastolic mean',
                  position: 'insideBottomLeft',
                  fill: '#806c99',
                  fontSize: 11,
                }}
              />
            )}
            {visibleEvents.map((event, index) => (
              <ReferenceLine
                key={event.id || `${event.ts}-${event.label}`}
                x={new Date(event.ts ?? event.time).getTime()}
                stroke="#c08336"
                strokeDasharray="3 4"
                label={{
                  value: event.label,
                  position: 'insideTop',
                  fill: '#8a5a12',
                  fontSize: 10,
                  dy: (index % 3) * 18,
                }}
              />
            ))}
            {visibleAlerts.map((alert, index) => (
              <ReferenceDot
                key={alert.id || `${alert.rule_id || alert.ruleId}-${alert.time}-${index}`}
                x={alert.time}
                y={alert.value}
                r={6}
                fill="#b3303d"
                stroke="#fff"
                strokeWidth={2}
                label={{
                  value: alert.rule_id || alert.ruleId || 'Alert',
                  position: 'top',
                  fill: '#9d2633',
                  fontSize: 10,
                }}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 12, color: '#4f6573' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state">
          <p>No saved samples match this selection.</p>
        </div>
      )}
    </div>
  );
});
