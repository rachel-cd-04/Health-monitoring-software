import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Users, ClipboardList, BookOpen, Settings, ChevronRight, ArrowLeft, X, Plus, Check, AlertTriangle, Eye, Download, Heart, Thermometer, Moon, Droplet, Dumbbell, Smile, Battery, Clock, RotateCcw, Shield, CheckCircle2, Circle, ChevronDown, ExternalLink, Lock, Search, ArrowUpRight, CheckCheck, Copy, User } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Body from './Body';
import { CREW, MISSION_DAY, MISSION_LENGTH } from './sim';
import { INDICATORS, LOG_ITEMS, GUIDES, SOURCES, CHECKIN_ORDER, CHECKINS_PER_DAY } from './content/indicators';
import { buildEngine } from './rules';
import { loadState, saveState, freshState, makeRecord, uid, fmtTime, fmtVal, latestOf, vsBaseline, downloadFile, dateOfDay, fmtDate } from './store';
import './styles.css';

const iconFor = { heart_rate: Heart, bp_systolic: Activity, bp_diastolic: Activity, blood_sugar: Droplet, temperature: Thermometer, sleep_hours: Moon, mood: Smile, fatigue: Battery, exercise_min: Dumbbell };
const WHO = { self: 'You', crew: 'Crew', ground: 'Flight surgeon on ground' };
const STATUS_TEXT = { green: 'No active alerts', amber: 'Needs attention', red: 'Needs attention now', grey: 'No recent data' };

function App() {
  const [data, setData] = useState(loadState);
  const [view, setView] = useState('crew');
  const [detail, setDetail] = useState(null);
  const [locked, setLocked] = useState(null);
  const [metric, setMetric] = useState('heart_rate');
  const [period, setPeriod] = useState(30);
  const [measure, setMeasure] = useState(null);
  const [checkin, setCheckin] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [emergencyFor, setEmergencyFor] = useState(null);
  const [settings, setSettings] = useState(false);
  const [session, setSession] = useState(false);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(Date.now());
  const [storageError, setStorageError] = useState(false);
  const timer = useRef(null);
  useEffect(() => { setStorageError(!saveState(data)); }, [data]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const notify = text => { setToast(text); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 4500); };
  const eng = useMemo(() => buildEngine(data.records, data.emergencyLogs), [data.records, data.emergencyLogs]);
  const operator = CREW.find(c => c.id === data.operator) || CREW[2];
  const openPerson = id => { if (id !== operator.id) { setLocked(id); return; } setMetric('heart_rate'); setDetail(id); };
  const recordMeasurement = (records, opts = {}) => {
    setData(old => ({ ...old, records: [...old.records, ...records] }));
    if (!opts.silent) notify('Measurement saved to the history of ' + CREW.find(c => c.id === records[0].astroId).name);
  };
  const finishCheckin = () => setData(d => ({ ...d, checkins: [...(d.checkins || []), { id: uid(), astroId: operator.id, day: MISSION_DAY, ts: Date.now() }] }));
  const checkinsToday = (data.checkins || []).filter(c => c.astroId === operator.id && c.day === MISSION_DAY).length;
  const ack = a => { setData(d => ({ ...d, ack: { ...d.ack, [a.key]: Date.now() } })); notify('Alert acknowledged'); };
  const nav = [['crew', 'Crew', Users], ['records', 'History', ClipboardList], ['sources', 'Library', BookOpen]];
  const totalAlerts = CREW.reduce((t, c) => t + eng.alerts[c.id].length, 0);

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => setView('crew')} aria-label="SOMA home"><span className="brand-mark"><Activity size={25} /></span><span>SOMA<small>Flight Health</small></span></button><div className="mission-name"><span className="mission-dot" />Space transit<span className="divider" />Day {MISSION_DAY} of {MISSION_LENGTH}</div><div className="top-right"><span className="demo-label">Simulated data</span><time>{fmtTime(now)}<small>local</small></time><button className="operator" onClick={() => setSession(true)}><span className="avatar" style={{ '--person': operator.color }}>{operator.initials}</span><span>{operator.name}<small>Demo operator</small></span><ChevronDown size={14} /></button></div></header>
    <aside className="sidebar"><div className="nav-label">On board</div><nav>{nav.map(([id, label, Icon]) => <button key={id} aria-label={label} className={'nav-button ' + (view === id ? 'selected' : '')} onClick={() => setView(id)}><Icon size={20} /><span>{label}</span></button>)}</nav><div className="side-bottom"><button className="nav-button" onClick={() => setSettings(true)}><Settings size={19} />Settings</button><button aria-label="Emergency" className="emergency-nav" onClick={() => setEmergency(true)}><Plus size={20} /><span>Emergency</span><ArrowUpRight size={17} /></button><div className="side-foot">SOMA / demo<span>Health terminal</span></div></div></aside>
    <main className="main-content">
      {storageError && <div className="banner warning">Your browser does not allow saving data. Download your records before closing.</div>}
      {view === 'crew' && <><PageHeading eyebrow="Crew monitor" title="Your team's status." subtitle="General status only. Health details are private to each person." actions={<button className="button primary" onClick={() => setMeasure({ crewId: operator.id, item: 'heart_rate' })}><Plus size={17} />Log measurement</button>} />
        <div className="status-ribbon"><div><span className="status-light green" /><b>Simulated data</b></div><span>04 <small>crew members</small></span><span className={totalAlerts ? 'amber-text' : ''}>{String(totalAlerts).padStart(2, '0')} <small>active alerts</small></span><span><Shield size={15} />Local record</span></div>
        <section className="crew-grid" aria-label="General status of the four crew members">{CREW.map((person, i) => {
          const st = eng.status[person.id].overall; const n = eng.alerts[person.id].length; const warn = st === 'amber' || st === 'red';
          return <article className={'crew-panel ' + (warn ? 'has-alert' : '')} key={person.id} style={{ '--person': person.color }}><div className="crew-panel-top"><span className="crew-number">{String(i + 1).padStart(2, '0')}</span><span className={'tiny-state ' + (warn ? 'amber' : '')}>{STATUS_TEXT[st]}</span></div><button className="crew-name" onClick={() => openPerson(person.id)}><h2>{person.name}</h2><span>{person.role}</span><ChevronRight size={17} /></button><button className="body-button" onClick={() => openPerson(person.id)} aria-label={`Open profile of ${person.name}`}><div className="body-caption">Front view</div><Body uid={person.id} alert={warn} /><span className="body-coordinate">General status only</span></button><div className="public-info"><div><b>{n}</b><span>active alert{n === 1 ? '' : 's'}</span></div><div className="private-note"><Lock size={13} />Health values are private</div></div><button className={'crew-status ' + (warn ? 'warning' : '')} onClick={() => openPerson(person.id)}>{warn ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}<span>{person.id === operator.id ? 'Open my private profile' : 'Profile is private'}</span><ChevronRight size={14} /></button></article>;
        })}</section>
        <div className="dashboard-bottom"><section className="panel next-panel"><div className="section-heading"><h3>Daily check-in</h3><span>{Math.min(checkinsToday, CHECKINS_PER_DAY)} of {CHECKINS_PER_DAY} done today</span></div><div className="next-content"><div className="next-icon"><ClipboardList size={24} /></div><div><h4>How are you feeling, {operator.name.split(' ')[0]}?</h4><p>{checkinsToday >= CHECKINS_PER_DAY ? 'Daily target done. You can do another check-in at any time.' : 'A guided walk through your measurements. Aim for two check-ins a day.'}</p></div><button className="button primary" onClick={() => setCheckin(true)}>{checkinsToday >= CHECKINS_PER_DAY ? 'Do another check-in' : 'Start check-in'}<ChevronRight size={16} /></button></div></section></div>
        <p className="data-footnote">Synthetic demonstration data. Public view: name, role and general status only. Health values stay private to each person.</p>
      </>}
      {view === 'records' && <Records data={data} operator={operator} />}
      {view === 'sources' && <Sources />}
      <footer className="main-footer"><span><Activity size={13} />SOMA · Health during flight</span><span>All data is simulated · Thresholds are illustrative · Not a diagnosis</span></footer>
    </main>
    {detail && <Modal title="Private health profile" onClose={() => setDetail(null)} wide><PersonDetail person={CREW.find(c => c.id === detail)} eng={eng} data={data} metric={metric} setMetric={setMetric} period={period} setPeriod={setPeriod} onAck={ack} onMeasure={() => { setMeasure({ crewId: detail, item: INDICATOR_TO_ITEM[metric] }); setDetail(null); }} /></Modal>}
    {checkin && <CheckIn operator={operator} data={data} eng={eng} onClose={() => setCheckin(false)} onSave={recordMeasurement} onFinish={finishCheckin} onProfile={() => { setCheckin(false); setMetric('heart_rate'); setDetail(operator.id); }} />}
    {measure && <Measurement initial={measure} operator={operator} eng={eng} onClose={() => setMeasure(null)} onSave={recordMeasurement} />}
    {locked && <Modal title="Private profile" onClose={() => setLocked(null)}>{(() => { const p = CREW.find(c => c.id === locked); return <div className="locked-view"><span className="avatar large" style={{ '--person': p.color }}>{p.initials}</span><h2>{p.name}</h2><p className="muted">{p.role}</p><div className="locked-box"><Lock size={20} /><div><b>Health details are private.</b><p>Values, trends and records can only be seen by {p.name.split(' ')[0]}. The overview shows general status only.</p></div></div><div className="locked-actions"><button className="button danger" onClick={() => { setEmergencyFor(p.id); setLocked(null); setEmergency(true); }}><Plus size={17} />Emergency for {p.name.split(' ')[0]}</button><button className="button subtle" onClick={() => { setData(d => ({ ...d, operator: p.id })); setLocked(null); notify('Demo operator: ' + p.name); }}>Switch to {p.name.split(' ')[0]} (demo)</button></div><p className="small muted">The operator switch is a demo shortcut. A PIN will replace it.</p></div>; })()}</Modal>}
    {emergency && <Emergency eng={eng} operator={operator} initialPatient={emergencyFor} onClose={() => { setEmergency(false); setEmergencyFor(null); }} setData={setData} />}
    {settings && <SettingsModal data={data} setData={setData} onClose={() => setSettings(false)} notify={notify} />}
    {session && <Modal title="Select demo operator" onClose={() => setSession(false)}><p className="muted">Demo shortcut: identifies who is logging. It does not protect anything; a PIN will replace it.</p><div className="operator-list">{CREW.map(c => <button key={c.id} onClick={() => { setData(d => ({ ...d, operator: c.id })); setSession(false); notify('Demo operator: ' + c.name); }}><span className="avatar" style={{ '--person': c.color }}>{c.initials}</span><span><b>{c.name}</b><small>{c.role}</small></span>{c.id === operator.id && <Check size={20} />}</button>)}</div></Modal>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}<button onClick={() => setToast('')} aria-label="Close notification"><X size={16} /></button></div>}
  </div>;
}

const INDICATOR_TO_ITEM = { heart_rate: 'heart_rate', bp_systolic: 'blood_pressure', bp_diastolic: 'blood_pressure', blood_sugar: 'blood_sugar', temperature: 'temperature', sleep_hours: 'sleep_hours', mood: 'mood', fatigue: 'fatigue', exercise_min: 'exercise_min' };

function PageHeading({ eyebrow, title, subtitle, actions }) { return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>; }

function Modal({ title, onClose, children, wide = false }) {
  const container = useRef(); const close = useRef(onClose); close.current = onClose;
  useEffect(() => { const prev = document.activeElement; const el = container.current; el?.focus(); const fn = e => { if (e.key === 'Escape') close.current(); if (e.key === 'Tab') { const items = el.querySelectorAll('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]'); const first = items[0], last = items[items.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }; document.addEventListener('keydown', fn); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = overflow; prev?.focus(); }; }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className={'modal ' + (wide ? 'wide' : '')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={container}><div className="modal-heading"><span>{title}</span><button className="icon-button" aria-label="Close window" onClick={onClose}><X size={20} /></button></div>{children}</section></div>;
}

function SourceChip({ id }) {
  const s = SOURCES[id]; if (!s) return null;
  const inner = <><span className="chip-agency">{s.agency}</span>{s.title}{s.url && <ExternalLink size={12} />}</>;
  return s.url ? <a className="source-chip" href={s.url} target="_blank" rel="noreferrer">{inner}</a> : <span className="source-chip plain">{inner}</span>;
}

function AlertCard({ alert, acked, onAck }) {
  const [done, setDone] = useState({});
  const ind = INDICATORS[alert.indicator];
  const Icon = alert.level === 'red' ? AlertTriangle : Eye;
  return <article className={'alert-card ' + alert.level + (acked ? ' acked' : '')}>
    <header><span className={'level-tag ' + alert.level}><Icon size={14} />{alert.level === 'red' ? 'Act' : 'Watch'}</span><h3>{alert.title}</h3>{alert.value != null && ind && <span className="alert-value">{fmtVal(alert.value)} <small>{ind.unit}</small></span>}</header>
    <p className="alert-msg">{alert.message}</p>
    {!acked && <><ul className="alert-actions">{alert.actions.map((a, i) => <li key={a}><label className={done[i] ? 'completed' : ''}><input type="checkbox" checked={!!done[i]} onChange={e => setDone(d => ({ ...d, [i]: e.target.checked }))} /><span>{a}</span></label></li>)}</ul>
      <div className="who-row"><b>Who should act</b>{alert.who.map(w => <span className="who" key={w}>{WHO[w]}</span>)}</div></>}
    <footer><div className="why-row"><span className="rule-id">Rule {alert.ruleId} v{alert.version}</span><SourceChip id={alert.source} /></div><p className="notice">Illustrative threshold · Not a diagnosis</p>
      <div className="alert-buttons">{acked ? <span className="pill">Acknowledged</span> : <button className="button primary" onClick={() => onAck(alert)}><Check size={16} />Got it</button>}</div></footer>
  </article>;
}

function Trend({ series, metric, period }) {
  const from = Math.max(1, MISSION_DAY - period);
  const chartData = (series || []).filter(p => p.day >= from);
  const id = `trend-${metric}`;
  return <div className="trend-chart">{chartData.length >= 2 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 18, right: 18, left: -20, bottom: 0 }}><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#65c9df" stopOpacity=".25" /><stop offset="1" stopColor="#65c9df" stopOpacity="0" /></linearGradient></defs><CartesianGrid stroke="#243041" strokeDasharray="3 6" vertical={false} /><XAxis dataKey="day" type="number" domain={[from, MISSION_DAY]} tickFormatter={d => 'D' + d} stroke="#718197" tick={{ fontSize: 11 }} minTickGap={30} axisLine={false} tickLine={false} allowDecimals={false} /><YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} stroke="#718197" axisLine={false} tickLine={false} /><Tooltip labelFormatter={d => `Day ${d}`} formatter={v => [`${fmtVal(v)} ${INDICATORS[metric].unit}`, INDICATORS[metric].short]} contentStyle={{ background: '#142031', border: '1px solid #3d536d', borderRadius: 6, color: '#e9f0f5' }} /><Area type="monotone" dataKey="value" stroke="#70d2e6" strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <div className="empty-state"><Activity /><p>Not enough data in this period.</p></div>}</div>;
}

function PersonDetail({ person, eng, data, metric, setMetric, period, setPeriod, onMeasure, onAck }) {
  const [tab, setTab] = useState('overview');
  const info = INDICATORS[metric]; const guide = GUIDES[info.guide]; const Icon = iconFor[metric];
  const series = eng.series[person.id]?.[metric] || []; const last = series[series.length - 1];
  const base = eng.baselines[person.id][metric];
  const verdict = last ? vsBaseline(metric, last.value, base, info.max <= 5) : null;
  const alerts = eng.alerts[person.id];
  return <><div className="person-title"><span className="avatar large" style={{ '--person': person.color }}>{person.initials}</span><div><h2>{person.name}</h2><p>{person.role}</p></div><span className="demo-label">Private · only you</span></div>
    {alerts.length > 0 && <div className="detail-alerts"><h3 className="sys-h">Active alerts</h3>{alerts.map(a => <AlertCard key={a.key} alert={a} acked={!!data.ack[a.key]} onAck={onAck} />)}</div>}
    <div className="tabs"><button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Status and trend</button><button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>How to measure it</button></div>
    <div className="person-content"><div className="detail-body"><Body uid={'detail-' + person.id} alert={eng.status[person.id].overall !== 'green'} active={metric} onSelect={setMetric} /><span className="muted small">Select a body marker</span></div>
      <div className="detail-main"><div className="metric-tabs">{Object.entries(INDICATORS).map(([key, m]) => <button className={key === metric ? 'active' : ''} key={key} onClick={() => setMetric(key)}>{m.short}</button>)}</div>
        <div className="detail-reading"><div><p><Icon size={17} />{info.label}</p><strong>{last ? fmtVal(last.value) : '—'}<small>{info.unit}</small></strong></div>{verdict && <span className={'vs ' + verdict}>{verdict === 'normal' ? 'Normal for you' : verdict === 'higher' ? 'Higher than usual' : 'Lower than usual'}</span>}</div>
        {tab === 'overview' ? <><div className="chart-toolbar"><span>Reading history</span><div className="segmented">{[7, 30, 180].map(d => <button className={period === d ? 'active' : ''} key={d} onClick={() => setPeriod(d)}>{d} days</button>)}</div></div><Trend series={series} metric={metric} period={period} /><div className="reading-note"><Activity size={18} /><div><b>{last ? `Last record · day ${last.day} · ${last.source}` : 'No data yet'}</b><p>{base && last ? `Your average is ${fmtVal(base.mean)} ${info.unit}.` : 'Log a measurement to start your history.'}</p></div></div></>
          : <div className="info-copy" key={metric}><h3>How to measure</h3><ol className="guide-steps">{guide.steps.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol><h3>Why it matters in space</h3><p>{guide.why}</p><h3>Typical range <span className="tag">Illustrative, for demo</span></h3><p>{guide.range}</p><h3>If it looks abnormal</h3><ul>{guide.abnormal.map(a => <li key={a}>{a}</li>)}</ul><div className="chip-row"><SourceChip id={guide.source} /></div></div>}
        <div className="detail-actions"><button className="button primary" onClick={onMeasure}><Plus size={17} />Log {info.short.toLowerCase()}</button></div></div></div></>;
}

function Measurement({ initial, operator, eng, onClose, onSave }) {
  const [step, setStep] = useState(0), [who, setWho] = useState(initial.crewId), [itemId, setItemId] = useState(initial.item || 'heart_rate'), [vals, setVals] = useState({}), [error, setError] = useState(''), [saved, setSaved] = useState(null);
  const item = LOG_ITEMS.find(i => i.id === itemId) || LOG_ITEMS[0]; const guide = GUIDES[item.guide]; const person = CREW.find(c => c.id === who);
  const submit = e => {
    e.preventDefault();
    const recs = [];
    for (const f of item.fields) {
      const def = INDICATORS[f]; const n = Number(vals[f]);
      if (vals[f] == null || vals[f] === '' || !Number.isFinite(n) || n < def.min || n > def.max || (def.max <= 5 && !Number.isInteger(n))) { setError(`${def.label}: enter a value between ${def.min} and ${def.max} ${def.unit}.`); return; }
      recs.push(makeRecord(who, f, n, def.unit, { operator: operator.id }));
    }
    if (item.id === 'blood_pressure' && Number(vals.bp_diastolic) >= Number(vals.bp_systolic)) { setError('Systolic (top) should be higher than diastolic (bottom).'); return; }
    onSave(recs);
    setSaved(recs.map(r => ({ indicator: r.indicator, value: r.value, verdict: vsBaseline(r.indicator, r.value, eng.baselines[who][r.indicator], INDICATORS[r.indicator].max <= 5) })));
  };
  return <Modal title={saved ? 'Measurement logged' : 'Log measurement'} onClose={onClose}>{saved ? <div className="success-state"><span className="success-icon"><CheckCheck size={34} /></span><h2>Record saved.</h2><p>{person.name}</p>{saved.map(s => <p key={s.indicator}><b>{INDICATORS[s.indicator].label}</b> {fmtVal(s.value)} {INDICATORS[s.indicator].unit} · <span className={'vs ' + s.verdict}>{s.verdict === 'normal' ? 'Normal for you' : s.verdict === 'higher' ? 'Higher than usual' : 'Lower than usual'}</span></p>)}<button className="button primary" onClick={onClose}>Back to the monitor</button></div> : <><div className="step-progress"><span className={step === 0 ? 'active' : 'done'}>1 · Prepare</span><div /><span className={step === 1 ? 'active' : ''}>2 · Record</span></div>
    {step === 0 ? <><h2 className="modal-title">A reading with context.</h2><div className="form-grid"><label>Person being assessed<select value={who} onChange={e => setWho(e.target.value)}>{CREW.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Indicator<select value={itemId} onChange={e => { setItemId(e.target.value); setVals({}); setError(''); }}>{LOG_ITEMS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label></div><ol className="guide-steps">{guide.steps.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol><div className="source-note"><BookOpen size={16} /><span>General guide. Follow your instrument's manual and the mission procedure. Typical range: {guide.range}</span></div><button className="button primary full" onClick={() => setStep(1)}>Continue to recording<ChevronRight size={17} /></button></>
      : <form onSubmit={submit}><button type="button" className="text-button" onClick={() => setStep(0)}><ArrowLeft size={15} />Change indicator</button><h2 className="modal-title">{item.label}</h2><p className="muted">Patient {person.name} · Logged by {operator.name}</p>{item.fields.map(f => <label className="value-field" key={f}>{INDICATORS[f].label}<div><input type="number" inputMode="decimal" autoFocus={f === item.fields[0]} min={INDICATORS[f].min} max={INDICATORS[f].max} step={INDICATORS[f].step} value={vals[f] ?? ''} onChange={e => { setVals(v => ({ ...v, [f]: e.target.value })); setError(''); }} placeholder="—" required /><span>{INDICATORS[f].unit}</span></div></label>)}{error && <p role="alert" className="error-text">{error}</p>}<button className="button primary full"><Check size={17} />Save to history</button></form>}</>}</Modal>;
}

const FACES = ['😞', '🙁', '😐', '🙂', '😄'];
const FACE_LABEL = ['Very low', 'Low', 'Okay', 'Good', 'Very good'];
const FATIGUE_LABEL = ['Fresh', 'A little tired', 'Tired', 'Very tired', 'Exhausted'];
const VERDICT_TEXT = { normal: 'Normal for you', higher: 'Higher than usual', lower: 'Lower than usual' };

// Guided check-in: walks through every measurement, one after another. Can be done several times a day;
// sleep is only asked once a day.
function CheckIn({ operator, data, eng, onClose, onSave, onFinish, onProfile }) {
  const hasSleep = useRef(data.records.some(r => r.astroId === operator.id && r.day === MISSION_DAY && r.indicator === 'sleep_hours')).current;
  const steps = useMemo(() => CHECKIN_ORDER.filter(id => !(id === 'sleep_hours' && hasSleep)).map(id => LOG_ITEMS.find(i => i.id === id)), [hasSleep]);
  const [idx, setIdx] = useState(0), [vals, setVals] = useState({ sleep_hours: 7 }), [error, setError] = useState(''), [results, setResults] = useState([]), [skipped, setSkipped] = useState([]), [done, setDone] = useState(false);
  const item = steps[idx]; const guide = item && GUIDES[item.guide];
  const advance = () => { if (idx + 1 >= steps.length) { onFinish(); setDone(true); } else { setIdx(idx + 1); setError(''); } };
  const next = () => {
    const recs = [];
    for (const f of item.fields) {
      const def = INDICATORS[f]; const n = Number(vals[f]);
      if (vals[f] == null || vals[f] === '' || !Number.isFinite(n) || n < def.min || n > def.max || (def.max <= 5 && !Number.isInteger(n))) { setError(def.max <= 5 ? `Choose a value from ${def.min} to ${def.max}.` : `${def.label}: enter a value between ${def.min} and ${def.max} ${def.unit}.`); return; }
      recs.push(makeRecord(operator.id, f, n, def.unit, { operator: operator.id }));
    }
    if (item.id === 'blood_pressure' && Number(vals.bp_diastolic) >= Number(vals.bp_systolic)) { setError('Systolic (top) should be higher than diastolic (bottom).'); return; }
    onSave(recs, { silent: true });
    setResults(r => [...r, ...recs.map(x => ({ indicator: x.indicator, value: x.value, verdict: vsBaseline(x.indicator, x.value, eng.baselines[operator.id][x.indicator], INDICATORS[x.indicator].max <= 5) }))]);
    advance();
  };
  const skip = () => { setSkipped(s => [...s, item.label]); advance(); };
  const alertsNow = eng.alerts[operator.id].filter(a => a.ruleId !== 'X-01').length;
  if (done) {
    const shown = Object.values(Object.fromEntries(results.map(r => [r.indicator, r])));
    return <Modal title="Check-in complete" onClose={onClose}><div className="ci-summary"><span className="success-icon"><CheckCheck size={34} /></span><h2>Check-in saved.</h2>
      <ul>{shown.map(s => <li key={s.indicator}><span><b>{INDICATORS[s.indicator].label}</b> {fmtVal(s.value)} {INDICATORS[s.indicator].unit}</span><span className={'vs ' + s.verdict}>{VERDICT_TEXT[s.verdict]}</span></li>)}</ul>
      {skipped.length > 0 && <p className="small muted">Skipped: {skipped.join(', ')}.</p>}
      <p className="muted">{alertsNow > 0 ? `You have ${alertsNow} active alert${alertsNow > 1 ? 's' : ''} in your private profile.` : 'No active alerts.'}</p>
      <div className="ci-actions"><button className="button subtle" onClick={onProfile}>Open my profile</button><button className="button primary" onClick={onClose}>Done</button></div></div></Modal>;
  }
  const set = (f, v) => { setVals(x => ({ ...x, [f]: v })); setError(''); };
  return <Modal title={`Check-in · step ${idx + 1} of ${steps.length}`} onClose={onClose}>
    <div className="ci-progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={idx + 1}>{steps.map((s, i) => <span key={s.id} className={i < idx ? 'done' : i === idx ? 'on' : ''} />)}</div>
    {idx === 0 && hasSleep && <p className="small muted">Sleep was already logged today, so it is skipped.</p>}
    <h2 className="modal-title">{item.label}</h2>
    {item.id === 'sleep_hours' && <div className="slider-row"><input type="range" min="0" max="12" step="0.5" value={vals.sleep_hours} onChange={e => set('sleep_hours', e.target.value)} aria-label="Hours of sleep last night" /><strong>{Number(vals.sleep_hours).toFixed(1)} <small>h</small></strong></div>}
    {item.id === 'mood' && <div className="faces">{FACES.map((f, i) => <button key={f} type="button" className={'face' + (Number(vals.mood) === i + 1 ? ' on' : '')} onClick={() => set('mood', i + 1)} aria-pressed={Number(vals.mood) === i + 1} aria-label={`${i + 1} of 5, ${FACE_LABEL[i]}`}><span>{f}</span><small>{FACE_LABEL[i]}</small></button>)}</div>}
    {item.id === 'fatigue' && <div className="scale">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" className={'scale-btn' + (Number(vals.fatigue) === n ? ' on' : '')} onClick={() => set('fatigue', n)} aria-pressed={Number(vals.fatigue) === n}><strong>{n}</strong><small>{FATIGUE_LABEL[n - 1]}</small></button>)}</div>}
    {!['sleep_hours', 'mood', 'fatigue'].includes(item.id) && <div className="measure-fields">{item.fields.map(f => <label className="value-field" key={f}>{INDICATORS[f].label}<div><input type="number" inputMode="decimal" autoFocus={f === item.fields[0]} min={INDICATORS[f].min} max={INDICATORS[f].max} step={INDICATORS[f].step} value={vals[f] ?? ''} onChange={e => set(f, e.target.value)} placeholder="—" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); next(); } }} /><span>{INDICATORS[f].unit}</span></div></label>)}</div>}
    {error && <p role="alert" className="error-text">{error}</p>}
    <details className="ci-help"><summary>How do I measure this?</summary><ol className="guide-steps">{guide.steps.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol><p className="small muted">Typical range: {guide.range}</p></details>
    <div className="ci-actions">
      <button type="button" className="text-button" disabled={idx === 0} onClick={() => { setIdx(idx - 1); setError(''); }}><ArrowLeft size={15} />Back</button>
      <button type="button" className="button subtle" onClick={skip}>Skip</button>
      <button type="button" className="button primary" onClick={next}>{idx + 1 >= steps.length ? 'Finish' : 'Save and next'}<ChevronRight size={17} /></button>
    </div>
  </Modal>;
}

function Records({ data, operator }) {
  const [metric, setMetric] = useState('all'), [query, setQuery] = useState(''), [page, setPage] = useState(0);
  const records = data.records.filter(r => r.astroId === operator.id && (metric === 'all' || r.indicator === metric) && (!query || (INDICATORS[r.indicator].label + ' ' + (r.note || '')).toLowerCase().includes(query.toLowerCase()))).sort((a, b) => b.ts - a.ts);
  const exportCsv = () => { const cell = s => '"' + String(s ?? '').replaceAll('"', '""') + '"'; const rows = [['Indicator', 'Value', 'Unit', 'Day', 'Date', 'Source'], ...records.map(r => [INDICATORS[r.indicator].label, r.value, r.unit, r.day, new Date(r.ts).toISOString(), r.source])]; downloadFile('SOMA-records.csv', '﻿' + rows.map(row => row.map(cell).join(',')).join('\r\n'), 'text/csv;charset=utf-8'); };
  return <><PageHeading eyebrow="Your private records" title="Every reading counts." subtitle="Browse, filter and export your own readings. Only you can see them." actions={<button className="button subtle" onClick={exportCsv}><Download size={17} />Export CSV</button>} />
    <div className="records-filters"><label className="search-field"><Search size={17} /><input aria-label="Search records" placeholder="Search indicator" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label><select aria-label="Filter by indicator" value={metric} onChange={e => { setMetric(e.target.value); setPage(0); }}><option value="all">All indicators</option>{Object.entries(INDICATORS).map(([k, m]) => <option value={k} key={k}>{m.short}</option>)}</select></div>
    <div className="panel records-table"><table><thead><tr><th>Indicator</th><th>Reading</th><th>Mission day</th><th>Logged</th><th>Source</th></tr></thead><tbody>{records.slice(page * 12, page * 12 + 12).map(r => <tr key={r.id}><td>{INDICATORS[r.indicator].label}</td><td><strong>{fmtVal(r.value)}</strong> <span className="muted">{r.unit}</span></td><td>Day {r.day}</td><td>{fmtDate(new Date(r.ts))} · {fmtTime(r.ts)}</td><td><span>{r.source}</span></td></tr>)}</tbody></table>{records.length === 0 && <div className="empty-state"><Search size={30} /><h3>No records for these filters</h3><button className="button subtle" onClick={() => { setMetric('all'); setQuery(''); setPage(0); }}>Reset filters</button></div>}<div className="table-footer"><span>{records.length} records</span><div><button className="button subtle" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button><span>{page + 1} / {Math.max(1, Math.ceil(records.length / 12))}</span><button className="button subtle" disabled={(page + 1) * 12 >= records.length} onClick={() => setPage(p => p + 1)}>Next</button></div></div></div></>;
}

function Emergency({ eng, operator, onClose, setData, initialPatient }) {
  const [patient, setPatient] = useState(initialPatient || 'unknown'), [situation, setSituation] = useState(''), [checks, setChecks] = useState({}), [note, setNote] = useState(''), [summary, setSummary] = useState(null), [closing, setClosing] = useState(false), [copied, setCopied] = useState(false);
  const startedAt = useRef(Date.now()).current;
  const steps = ['Alert the medical officer and ask the crew for help.', 'Identify the situation using the mission medical procedure.', 'Prepare the equipment the medical officer requests.', 'Record observations and prepare the summary for ground.'];
  const person = CREW.find(c => c.id === patient);
  const saveLog = () => { setData(d => ({ ...d, emergencyLogs: [{ id: uid(), startedAt, time: Date.now(), patientId: person ? person.id : null, situation, note, checks, operator: operator.id }, ...d.emergencyLogs] })); onClose(); };
  const build = () => {
    const L = ['EMERGENCY SUMMARY (illustrative · simulated data)', `Patient: ${person?.name || 'Not identified'}`, `Reported by: ${operator.name}`, `Situation: ${situation || 'Unclassified'}`, `Started: ${fmtTime(startedAt)}`, `Observations: ${note || 'Pending'}`, `Actions logged: ${steps.filter((_, i) => checks[i]).join(' ') || 'Pending'}`];
    if (person) { L.push('', 'Last recorded values (simulated):'); ['heart_rate', 'bp_systolic', 'bp_diastolic', 'temperature'].forEach(k => { const l = latestOf(eng.series, person.id, k); if (l) L.push(`  ${INDICATORS[k].label}: ${fmtVal(l.value)} ${INDICATORS[k].unit} (day ${l.day})`); }); const al = eng.alerts[person.id].filter(a => a.ruleId !== 'X-01'); if (al.length) L.push('Active alerts: ' + al.map(a => `${a.ruleId} ${a.title}`).join('; ')); }
    L.push('', 'Follow your mission medical procedures. This does not replace the flight surgeon.');
    return L.join('\n');
  };
  const copy = async () => { try { await navigator.clipboard.writeText(summary); } catch { /* clipboard unavailable */ } setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return <Modal title="Emergency assistance · Demo scenario" onClose={() => setClosing(true)} wide><div className="emergency-content"><div className="emergency-title"><span><Plus size={25} /></span><div><h2>Help a crewmate.</h2><p>Operator {operator.name} · No PIN needed in an emergency.</p></div></div>{closing ? <div className="close-confirm"><h3>End this assistance session</h3><p>The patient, observations and checked actions will be saved to the emergency log.</p><button className="button primary" onClick={saveLog}>Save and end</button><button className="button subtle" onClick={() => setClosing(false)}>Continue assistance</button></div> : <><div className="emergency-columns"><div><label>Person being assisted<select value={patient} onChange={e => { setPatient(e.target.value); setSummary(null); }}><option value="unknown">Not identified yet</option>{CREW.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Observed situation<select value={situation} onChange={e => { setSituation(e.target.value); setSummary(null); }}><option value="">Select situation</option>{['Chest pain', 'Unconscious / collapsed', 'Breathing problem', 'Bleeding / injury', 'Other'].map(s => <option key={s}>{s}</option>)}</select></label><label>Notes<textarea placeholder="Symptom onset, changes and actions taken" value={note} onChange={e => { setNote(e.target.value); setSummary(null); }} rows={4} /></label></div><div><h3>On-board coordination</h3><p className="muted">Check each action once it has been done.</p><div className="checklist">{steps.map((s, i) => <label key={s} className={checks[i] ? 'completed' : ''}><input type="checkbox" checked={!!checks[i]} onChange={e => setChecks(c => ({ ...c, [i]: e.target.checked }))} /><span>{s}</span></label>)}</div><div className="protocol-notice"><BookOpen size={20} /><div><b>Follow your mission medical procedures</b><p>This guide does not replace the flight surgeon. Steps are generic and illustrative.</p></div></div></div></div>
    <div className="emergency-send"><button className="button danger" onClick={() => setSummary(build())}>Prepare ground summary</button></div>
    {summary && <><pre className="em-summary">{summary}</pre><div className="emergency-send"><button className="button subtle" onClick={copy}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Copied' : 'Copy summary'}</button><button className="button primary" onClick={saveLog}>Save log and finish</button></div></>}</>}</div></Modal>;
}

function SettingsModal({ data, setData, onClose, notify }) {
  const [confirm, setConfirm] = useState(false);
  return <Modal title="Demo settings" onClose={onClose}><h2 className="modal-title">Settings.</h2><div className="settings-actions"><button className="button subtle full" onClick={() => { downloadFile('SOMA-session.json', JSON.stringify(data, null, 2)); notify('Session exported'); }}><Download size={17} />Download session data</button>{confirm ? <div className="reset-confirm"><p>Everything you logged in this browser will be deleted and the simulated mission rebuilt.</p><button className="button danger" onClick={() => { setData(freshState()); notify('Demo data reset'); onClose(); }}>Reset demo data</button><button className="button subtle" onClick={() => setConfirm(false)}>Cancel</button></div> : <button className="text-button" onClick={() => setConfirm(true)}><RotateCcw size={15} />Reset demo data</button>}</div><p className="small muted">All data is synthetic and stored only in this browser.</p></Modal>;
}

function Sources() {
  return <><PageHeading eyebrow="Flight library" title="Understand to act." subtitle="The scientific context behind health monitoring." />
    <div className="hazards-grid">{[['Radiation', 'Exposure to energetic particles beyond Earth\'s protection.'], ['Isolation & confinement', 'Confinement and living together in a demanding environment.'], ['Distance from Earth', 'Communication delays and the need for autonomy.'], ['Gravity fields', 'Cardiovascular, muscular and bone adaptations.'], ['Hostile / closed environment', 'Air quality, noise, light and limited resources.']].map(([title, text], i) => <article className="panel hazard" key={title}><span>{['☀', '◌', '↗', '◎', '⌂'][i]}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    <section className="panel sources-list"><div className="section-heading"><h3>Reference documentation</h3><BookOpen size={18} /></div>{Object.entries(SOURCES).filter(([, s]) => s.url).map(([id, s]) => <a href={s.url} key={id} target="_blank" rel="noreferrer"><div><h4>{s.title}</h4><p>{s.agency}</p></div><ExternalLink size={17} /></a>)}</section>
    <div className="panel scope-note"><h3>About this version</h3><p>SOMA is an interface demonstration for NASA Space Apps. It uses synthetic data, a local rule engine with illustrative thresholds, and manual logging. Operator selection is a demo shortcut. A clinical deployment would require real authentication, medical permissions, sensors and validated protocols.</p></div></>;
}

createRoot(document.getElementById('root')).render(<App />);
