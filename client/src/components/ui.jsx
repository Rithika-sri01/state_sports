import { useEffect, useState, useCallback } from 'react';
import { api, err } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { X } from 'lucide-react';

export const COLORS = ['#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#06b6d4', '#ec4899', '#dc2626'];
export const CATS = ['fitness', 'training', 'skill', 'tournament', 'discipline'];
export const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '');
export const fmt = d => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const dInput = d => (d ? new Date(d).toISOString().slice(0, 10) : '');
const TONES = { Cleared: 'green', Approved: 'green', Selected: 'green', Completed: 'green', Recovered: 'green', done: 'green', Pending: 'orange', 'Under Review': 'orange', 'Further Review': 'orange', Upcoming: 'orange', Scheduled: 'orange', Recovering: 'orange', current: 'blue', Failed: 'red', Rejected: 'red', 'Not Selected': 'red', Severe: 'red', failed: 'red', None: 'gray' };
export const Badge = ({ tone, children }) => <span className={`badge t-${tone || TONES[children] || 'blue'}`}>{children}</span>;
export const Ver = ({ v }) => <Badge tone={v === 'verified' ? 'green' : v === 'synthetic-demo' ? 'gray' : 'orange'}>{v === 'synthetic-demo' ? 'Synthetic demo' : cap(v || 'unverified')}</Badge>;
export const scoreTone = v => (v >= 80 ? 'green' : v >= 65 ? 'blue' : v >= 50 ? 'orange' : 'red');

export function useGet(url, params) {
  const [s, set] = useState({ data: null, loading: true, error: null });
  const key = JSON.stringify(params || {});
  const load = useCallback(() => {
    if (!url) { set({ data: null, loading: false, error: null }); return; }
    set(p => ({ ...p, loading: true }));
    api.get(url, { params: JSON.parse(key) }).then(r => set({ data: r.data, loading: false, error: null })).catch(e => set({ data: null, loading: false, error: err(e) }));
  }, [url, key]);
  useEffect(load, [load]);
  return { ...s, reload: load };
}
export function useForm(init) {
  const [f, setF] = useState(init);
  const bind = k => ({ value: f[k] ?? '', onChange: e => setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })) });
  return [f, bind, setF];
}
export function useSubmit(fn, onDone) {
  const [st, set] = useState({ busy: false, error: '', ok: '', checks: null });
  const run = async (...a) => {
    set({ busy: true, error: '', ok: '', checks: null });
    try { const r = await fn(...a); set({ busy: false, error: '', ok: 'Saved successfully', checks: null }); onDone && onDone(r); }
    catch (e) { set({ busy: false, error: err(e), ok: '', checks: e.response?.data?.checks || null }); }
  };
  return [run, st];
}
export const Msg = ({ st }) => (<>
  {st.error && <div className="alert err">{st.error}</div>}
  {st.checks && <div className="alert warn">{st.checks.map((c, i) => <div key={i}>{c.pass ? '✓' : '✗'} {c.label} — {c.detail}</div>)}</div>}
  {st.ok && <div className="alert ok">{st.ok}</div>}
</>);
export const Loading = ({ q }) => (q.error ? <div className="alert err">{q.error}</div> : <div className="empty">Loading…</div>);
export const PageHead = ({ title, sub, children }) => <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="sp">{children}</div></div>;
export const Card = ({ title, action, children, className = '' }) => <div className={`card ${className}`}>{(title || action) && <div className="card-h"><h3>{title}</h3>{action}</div>}{children}</div>;
export const Kpi = ({ icon: I, label, value, tone = 'blue', sub }) => (
  <div className="card kpi"><div className={`ic t-${tone}`}><I size={22} /></div><div><b>{value}</b><span>{label}</span>{sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}</div></div>);
export const Progress = ({ value, tone }) => <div className={`progress ${tone || scoreTone(value)}`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
export const Field = ({ label, children }) => <div className="field"><label>{label}</label>{children}</div>;
export const Select = ({ options, placeholder, ...p }) => <select {...p}><option value="">{placeholder || 'Select…'}</option>{options.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}</select>;
export const Empty = ({ children = 'No records found' }) => <div className="empty">{children}</div>;
export function Modal({ title, onClose, size = '', children }) {
  return <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className={`modal ${size}`}><div className="modal-h"><h3>{title}</h3><button className="x" onClick={onClose}><X size={16} /></button></div>{children}</div></div>;
}
export function Tabs({ tabs, value, onChange }) { return <div className="tabs">{tabs.map(t => <button key={t} className={value === t ? 'on' : ''} onClick={() => onChange(t)}>{t}</button>)}</div>; }
export function Table({ cols, rows, onRow, empty }) {
  if (!rows?.length) return <Empty>{empty}</Empty>;
  return <div className="tbl-wrap"><table className="tbl"><thead><tr>{cols.map((c, i) => <th key={i}>{c.h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={r._id || i} className={onRow ? 'click' : ''} onClick={() => onRow && onRow(r)}>{cols.map((c, j) => <td key={j}>{c.r(r)}</td>)}</tr>)}</tbody></table></div>;
}
export const List = ({ items, render, empty }) => (items?.length ? <div className="list">{items.map((x, i) => <div className="li" key={x._id || i}>{render(x)}</div>)}</div> : <Empty>{empty}</Empty>);

const H = 260;
export const Donut = ({ data }) => (
  <div style={{ height: H }}><ResponsiveContainer><PieChart><Pie data={data} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>{data.map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend iconType="circle" /></PieChart></ResponsiveContainer></div>);
export const Bars = ({ data, x = 'name', keys = ['count'], max, colors = COLORS, stack }) => (
  <div style={{ height: H }}><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={x} fontSize={12} /><YAxis fontSize={12} domain={max ? [0, max] : undefined} allowDecimals={false} /><Tooltip />{keys.length > 1 && <Legend />}{keys.map((k, i) => <Bar key={k} dataKey={k} fill={colors[i % colors.length]} radius={[6, 6, 0, 0]} stackId={stack} />)}</BarChart></ResponsiveContainer></div>);
export const Trend = ({ data, keys, x = 'name', colors = COLORS, domain }) => (
  <div style={{ height: H }}><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={x} fontSize={12} /><YAxis fontSize={12} domain={domain || [0, 100]} /><Tooltip />{keys.length > 1 && <Legend />}{keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />)}</LineChart></ResponsiveContainer></div>);
export const RadarCmp = ({ people }) => {
  const data = CATS.map(c => ({ cat: cap(c), ...Object.fromEntries(people.map(p => [p.name, p.scorecard[c]])) }));
  return <div style={{ height: 320 }}><ResponsiveContainer><RadarChart data={data}><PolarGrid /><PolarAngleAxis dataKey="cat" fontSize={12} /><PolarRadiusAxis domain={[0, 100]} fontSize={10} />{people.map((p, i) => <Radar key={p.name} name={p.name} dataKey={p.name} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.18} />)}<Legend /><Tooltip /></RadarChart></ResponsiveContainer></div>;
};
export function Journey({ steps, vertical }) {
  return <div className={`steps ${vertical ? 'vsteps' : ''}`}>{steps.map((s, i) => (
    <div key={s.name} className={`step ${s.status}`}><div className="c">{s.status === 'done' ? '✓' : s.status === 'failed' ? '✕' : s.status === 'current' ? '●' : '○'}</div>
      <div><b>{s.name}</b><small>{s.detail}</small><small>{s.date ? fmt(s.date) : s.status === 'pending' ? 'Not reached' : '—'}</small></div></div>))}</div>;
}
export const AlertDecision = () => <div className="alert info">Decision-support only: a high score or "eligible" status does <b>not</b> select an athlete. Promotion happens only after coach recommendation and a Selection Committee decision.</div>;
export function ScorePanel({ sc, showChecks = true }) {
  const gaps = sc.gaps || [];
  return <div>
    <div className="grid g23 mb" style={{ alignItems: 'center' }}>
      <div className="ring"><div className="big" style={{ color: `var(--${scoreTone(sc.overall) === 'blue' ? 'blue' : scoreTone(sc.overall)})` }}>{sc.overall}</div><div className="muted">Overall Development Score</div>
        <div style={{ marginTop: 8 }}><Badge tone={sc.eligible ? 'green' : 'orange'}>{sc.eligible ? 'Meets promotion criteria' : 'Not yet eligible'}</Badge></div></div>
      <div>{CATS.map(c => <div className="score-row" key={c}><span>{cap(c)}{sc.weights && <small className="muted"> ×{Math.round(sc.weights[c] * 100)}%</small>}</span><Progress value={sc[c]} /><b>{sc[c]}/100 {gaps.find(g => g.category === c) ? '⚠' : '✓'}</b></div>)}</div>
    </div>
    {gaps.length > 0 ? gaps.map(g => <div key={g.category} className="alert warn"><b>Development Gap: {cap(g.category)} ({g.score} / target {g.target})</b><br />Recommended Action: {g.action}</div>) : <div className="alert ok">No development gaps against the next-level targets.</div>}
    {showChecks && sc.checks?.length > 0 && <div><h4 style={{ margin: '14px 0 8px' }}>Promotion eligibility check{sc.nextLevel ? ` → ${sc.nextLevel.name}` : ''}</h4>
      {sc.checks.map((c, i) => <div key={i} className="sp" style={{ padding: '4px 0' }}><Badge tone={c.pass ? 'green' : 'red'}>{c.pass ? 'Pass' : 'Fail'}</Badge><span>{c.label}</span><small className="muted">{c.detail}</small></div>)}</div>}
  </div>;
}
