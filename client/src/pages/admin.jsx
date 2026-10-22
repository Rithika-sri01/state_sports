import { useState } from 'react';
import { Users as UsersIcon, UserCheck, ClipboardCheck, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import { api } from '../api';
import AthleteList from '../components/AthleteList';
import { useGet, PageHead, Kpi, Card, Donut, Bars, List, Badge, Loading, fmt, Table, Tabs, Modal, Field, Select, useForm, useSubmit, Msg, CATS, cap, dInput } from '../components/ui';

export function Dashboard() {
  const q = useGet('/dashboard'); const d = q.data;
  const [sync, st] = useSubmit(() => api.post('/scorecards/recompute-all'), q.reload);
  if (!d) return <Loading q={q} />;
  return <div>
    <PageHead title="Admin Dashboard" sub="Academy-wide overview of athlete development"><button className="btn ghost" disabled={st.busy} onClick={sync}><RefreshCw size={14} /> Recompute scorecards</button></PageHead>
    <div className="grid g4 mb"><Kpi icon={UsersIcon} label="Total Athletes" value={d.totalAthletes} sub={`${d.activeAthletes} active`} /><Kpi icon={UserCheck} label="Active Coaches" value={d.activeCoaches} tone="green" /><Kpi icon={ClipboardCheck} label="Pending Reviews" value={d.pendingReviews} tone="orange" sub={`${d.openPromotions} promotion requests`} /><Kpi icon={TrendingUp} label="Promotions" value={d.promotions} tone="purple" /></div>
    <div className="grid g2 mb"><Card title="Athletes by academy level"><Donut data={d.byLevel} /></Card><Card title="Sport-wise athlete count"><Bars data={d.bySport} /></Card></div>
    <div className="grid g3">
      <Card title="Recent activities"><List items={d.recentActivities} render={x => <><div className="p t-blue">•</div><div><b>{x.type}</b><br />{x.text}<br /><small>{fmt(x.date)}</small></div></>} /></Card>
      <Card title="Recent promotions"><List items={d.recentPromotions} empty="No promotions yet" render={x => <><div className="p t-green">↑</div><div><b>{x.athlete?.name}</b><br />{x.fromLevel?.name} → {x.toLevel?.name}<br /><small>{fmt(x.decidedAt)}</small></div></>} /></Card>
      <Card title="Upcoming events"><List items={d.upcomingEvents} empty="No upcoming events" render={x => <><div className="p t-purple">🏆</div><div><b>{x.name}</b><br />{x.sport?.name} · {x.level}<br /><small>{fmt(x.date)} · {x.venue}</small></div></>} /></Card>
    </div></div>;
}

export const Athletes = () => <AthleteList manage title="Athlete Management" sub="Register, edit, search and activate athletes" />;

function UserForm({ coachOnly, sports, onClose, onSaved }) {
  const [f, b] = useForm({ role: coachOnly ? 'coach' : 'medical' });
  const [go, st] = useSubmit(() => api.post('/users', f), () => { onSaved(); onClose(); });
  return <Modal title={coachOnly ? 'Add coach' : 'Add user'} onClose={onClose}><Msg st={st} />
    <div className="fgrid"><Field label="Name *"><input {...b('name')} /></Field><Field label="Email *"><input type="email" {...b('email')} /></Field><Field label="Password * (min 8)"><input type="password" {...b('password')} /></Field><Field label="Phone"><input {...b('phone')} /></Field>
      {!coachOnly && <Field label="Role *"><Select options={['admin', 'coach', 'medical', 'committee']} {...b('role')} /></Field>}
      {f.role === 'coach' && <><Field label="Sport *"><Select options={sports.map(s => ({ v: s._id, l: s.name }))} {...b('sport')} /></Field><Field label="Specialization"><input {...b('specialization')} /></Field><Field label="Experience (years)"><input type="number" min="0" {...b('experience')} /></Field></>}</div>
    <button className="btn" disabled={st.busy} onClick={go}>Create</button></Modal>;
}
function Assign({ coach, sports, onClose, onSaved }) {
  const all = useGet('/athletes'); const [sel, setSel] = useState(null), [sport, setSport] = useState(coach.sport?._id);
  const rows = (all.data || []).filter(a => a.sport?._id === sport); const mine = sel || new Set((all.data || []).filter(a => a.coach?._id === coach._id).map(a => a._id));
  const [go, st] = useSubmit(async () => { await api.put(`/coaches/${coach._id}`, { sport }); await api.put(`/coaches/${coach._id}/assign`, { athletes: [...mine] }); }, () => { onSaved(); onClose(); });
  return <Modal title={`Assign sport & athletes — ${coach.name}`} onClose={onClose}><Msg st={st} />
    <Field label="Sport"><Select options={sports.map(s => ({ v: s._id, l: s.name }))} value={sport} onChange={e => setSport(e.target.value)} /></Field>
    <div style={{ maxHeight: 280, overflow: 'auto' }}>{rows.map(a => <label key={a._id} className="sp" style={{ padding: 6 }}><input type="checkbox" checked={mine.has(a._id)} onChange={() => { const n = new Set(mine); n.has(a._id) ? n.delete(a._id) : n.add(a._id); setSel(n); }} />{a.name} <small className="muted">{a.athleteId} · {a.coach && a.coach._id !== coach._id ? `with ${a.coach.name}` : ''}</small></label>)}</div>
    <button className="btn" style={{ marginTop: 12 }} disabled={st.busy} onClick={go}>Save assignment ({mine.size})</button></Modal>;
}
export function Users() {
  const [tab, setTab] = useState('Coaches'), coaches = useGet('/coaches'), users = useGet('/users'), sports = useGet('/sports'); const [m, setM] = useState(null);
  const toggle = async u => { await api.patch(`/users/${u._id}/status`, { active: !u.active }); users.reload(); coaches.reload(); };
  const refresh = () => { coaches.reload(); users.reload(); };
  return <div><PageHead title="Coach & User Management" sub="Add coaches, assign sports and athletes, manage access"><button className="btn" onClick={() => setM({ coachOnly: tab === 'Coaches' })}><Plus size={16} /> {tab === 'Coaches' ? 'Add coach' : 'Add user'}</button></PageHead>
    <Card><Tabs tabs={['Coaches', 'All users']} value={tab} onChange={setTab} />
      {tab === 'Coaches' ? <Table rows={coaches.data || []} cols={[{ h: 'Coach', r: c => <div><b>{c.name}</b><br /><small className="muted">{c.user?.email}</small></div> }, { h: 'Sport', r: c => c.sport?.name }, { h: 'Athletes', r: c => c.athleteCount }, { h: 'Experience', r: c => (c.experience ? `${c.experience} yrs` : '—') }, { h: 'Status', r: c => <Badge tone={c.user?.active ? 'green' : 'gray'}>{c.user?.active ? 'Active' : 'Inactive'}</Badge> },
        { h: 'Actions', r: c => <div className="act"><button className="btn ghost sm" onClick={() => setM({ assign: c })}>Assign sport / athletes</button><button className={`btn sm ${c.user?.active ? 'danger' : 'green'}`} onClick={() => toggle({ _id: c.user._id, active: c.user.active })}>{c.user?.active ? 'Deactivate' : 'Activate'}</button></div> }]} />
        : <Table rows={users.data || []} cols={[{ h: 'Name', r: u => <b>{u.name}</b> }, { h: 'Email', r: u => u.email }, { h: 'Role', r: u => <Badge tone="purple">{u.role}</Badge> }, { h: 'Status', r: u => <Badge tone={u.active ? 'green' : 'gray'}>{u.active ? 'Active' : 'Inactive'}</Badge> }, { h: '', r: u => <button className={`btn sm ${u.active ? 'danger' : 'green'}`} onClick={() => toggle(u)}>{u.active ? 'Deactivate' : 'Activate'}</button> }]} />}</Card>
    {m?.assign && sports.data && <Assign coach={m.assign} sports={sports.data} onClose={() => setM(null)} onSaved={refresh} />}
    {m && !m.assign && sports.data && <UserForm coachOnly={m.coachOnly} sports={sports.data} onClose={() => setM(null)} onSaved={refresh} />}</div>;
}

function SportForm({ sport, onClose, onSaved }) {
  const [f, b, set] = useForm(sport ? { ...sport } : { weights: { fitness: .25, training: .2, skill: .25, tournament: .2, discipline: .1 } });
  const w = f.weights || {}; const total = CATS.reduce((t, c) => t + Number(w[c] || 0), 0);
  const [go, st] = useSubmit(() => { const body = { ...f, weights: Object.fromEntries(CATS.map(c => [c, Number(w[c])])) }; return sport ? api.put(`/sports/${sport._id}`, body) : api.post('/sports', body); }, () => { onSaved(); onClose(); });
  return <Modal title={sport ? `Edit ${sport.name}` : 'Add sport'} onClose={onClose}><Msg st={st} />
    <div className="fgrid"><Field label="Name *"><input {...b('name')} /></Field><Field label="Code"><input {...b('code')} /></Field></div><Field label="Description"><input {...b('description')} /></Field>
    <h4 style={{ margin: '4px 0 8px' }}>Scoring weights (Overall = Σ category × weight)</h4>
    <div className="fgrid">{CATS.map(c => <Field key={c} label={cap(c)}><input type="number" step="0.05" min="0" max="1" value={w[c] ?? ''} onChange={e => set(p => ({ ...p, weights: { ...p.weights, [c]: e.target.value } }))} /></Field>)}</div>
    <div className={`alert ${Math.abs(total - 1) < 0.001 ? 'ok' : 'warn'}`}>Weights total {total.toFixed(2)} {Math.abs(total - 1) < 0.001 ? '' : '(will be normalised automatically)'}</div>
    <label className="sp"><input type="checkbox" checked={f.active !== false} onChange={e => set(p => ({ ...p, active: e.target.checked }))} /> Active</label>
    <div style={{ marginTop: 12 }}><button className="btn" disabled={st.busy} onClick={go}>Save</button></div></Modal>;
}
function LevelForm({ level, onClose, onSaved }) {
  const [f, b, set] = useForm({ ...level, criteriaText: (level.criteria || []).join('\n') });
  const [go, st] = useSubmit(() => api.put(`/levels/${level._id}`, { ...f, criteria: f.criteriaText.split('\n').map(s => s.trim()).filter(Boolean), minOverall: +f.minOverall, minCategory: +f.minCategory, minSessions: +f.minSessions, minAttendance: +f.minAttendance }), () => { onSaved(); onClose(); });
  return <Modal title={`Promotion rules — ${level.name}`} onClose={onClose}><Msg st={st} /><p className="muted" style={{ marginTop: 0 }}>Requirements an athlete must meet to <b>enter</b> this level.</p>
    <Field label="Description"><input {...b('description')} /></Field>
    <div className="fgrid"><Field label="Minimum overall score"><input type="number" min="0" max="100" {...b('minOverall')} /></Field><Field label="Minimum score in every category"><input type="number" min="0" max="100" {...b('minCategory')} /></Field><Field label="Minimum training sessions"><input type="number" min="0" {...b('minSessions')} /></Field><Field label="Minimum attendance %"><input type="number" min="0" max="100" {...b('minAttendance')} /></Field></div>
    <label className="sp mb"><input type="checkbox" checked={f.requiresMedical !== false} onChange={e => set(p => ({ ...p, requiresMedical: e.target.checked }))} /> Requires medical clearance</label>
    <Field label="Progression criteria (one per line)"><textarea value={f.criteriaText} onChange={e => set(p => ({ ...p, criteriaText: e.target.value }))} /></Field>
    <button className="btn" disabled={st.busy} onClick={go}>Save rules</button></Modal>;
}
function EventForm({ sports, onClose, onSaved }) {
  const [f, b] = useForm({ level: 'District' }); const [go, st] = useSubmit(() => api.post('/tournaments', f), () => { onSaved(); onClose(); });
  return <Modal title="Add tournament / event" onClose={onClose}><Msg st={st} /><div className="fgrid"><Field label="Name *"><input {...b('name')} /></Field><Field label="Sport *"><Select options={sports.map(s => ({ v: s._id, l: s.name }))} {...b('sport')} /></Field><Field label="Date *"><input type="date" {...b('date')} /></Field><Field label="Level"><Select options={['Inter-Academy', 'District', 'State', 'National']} {...b('level')} /></Field></div><Field label="Venue *"><input {...b('venue')} /></Field><button className="btn" disabled={st.busy} onClick={go}>Create event</button></Modal>;
}
export function Rules() {
  const [tab, setTab] = useState('Sports & scoring weights'), sports = useGet('/sports'), levels = useGet('/levels'), events = useGet('/tournaments'); const [m, setM] = useState(null);
  return <div><PageHead title="Sports / Levels / Rules" sub="Configure sports, the academy ladder, progression criteria and scoring weights" />
    <Card><Tabs tabs={['Sports & scoring weights', 'Events & positions', 'Academy levels & promotion rules', 'Tournaments & events']} value={tab} onChange={setTab} />
      {tab.startsWith('Sports') && <><div style={{ textAlign: 'right', marginBottom: 10 }}><button className="btn" onClick={() => setM({ t: 'sport' })}><Plus size={16} /> Add sport</button></div>
        <Table rows={sports.data || []} cols={[{ h: 'Sport', r: s => <b>{s.name}</b> }, { h: 'Code', r: s => s.code }, ...CATS.map(c => ({ h: cap(c), r: s => `${Math.round((s.weights?.[c] || 0) * 100)}%` })), { h: 'Status', r: s => <Badge tone={s.active ? 'green' : 'gray'}>{s.active ? 'Active' : 'Inactive'}</Badge> }, { h: '', r: s => <button className="btn ghost sm" onClick={() => setM({ t: 'sport', sport: s })}>Edit</button> }]} /></>}
      {tab.startsWith('Academy') && <Table rows={levels.data || []} cols={[{ h: '#', r: l => l.order }, { h: 'Level', r: l => <div><b>{l.name}</b><br /><small className="muted">{l.description}</small></div> }, { h: 'Min overall', r: l => l.minOverall }, { h: 'Min per category', r: l => l.minCategory }, { h: 'Min sessions', r: l => l.minSessions }, { h: 'Min attendance', r: l => `${l.minAttendance}%` }, { h: 'Criteria', r: l => <ul style={{ margin: 0, paddingLeft: 16 }}>{l.criteria?.map((c, i) => <li key={i}>{c}</li>)}</ul> }, { h: '', r: l => <button className="btn ghost sm" onClick={() => setM({ t: 'level', level: l })}>Edit rules</button> }]} />}
      {tab.startsWith('Tournaments') && <><div style={{ textAlign: 'right', marginBottom: 10 }}><button className="btn" onClick={() => setM({ t: 'event' })}><Plus size={16} /> Add event</button></div>
        <Table rows={events.data || []} cols={[{ h: 'Event', r: e => <b>{e.name}</b> }, { h: 'Sport', r: e => e.sport?.name }, { h: 'Level', r: e => e.level }, { h: 'Date', r: e => fmt(e.date) }, { h: 'Venue', r: e => e.venue }, { h: 'Status', r: e => <Badge>{new Date(e.date) >= new Date() ? 'Upcoming' : 'Completed'}</Badge> }, { h: 'Participants', r: e => e.results?.length || 0 }]} /></>}
      {tab.startsWith('Events') && <Table rows={(sports.data || []).flatMap(s => (s.events || []).map(e => ({ _id: s._id + e.name, sport: s.name, ...e, positions: (s.positions || []).join(', ') || '—', source: s.source?.name })))} cols={[{ h: 'Sport', r: e => <b>{e.sport}</b> }, { h: 'Event', r: e => e.name }, { h: 'Category', r: e => e.category }, { h: 'Unit', r: e => e.unit }, { h: 'Positions', r: e => e.positions }, { h: 'Reference source for real data', r: e => e.source }]} />}
    </Card>
    {m?.t === 'sport' && <SportForm sport={m.sport} onClose={() => setM(null)} onSaved={sports.reload} />}
    {m?.t === 'level' && <LevelForm level={m.level} onClose={() => setM(null)} onSaved={levels.reload} />}
    {m?.t === 'event' && sports.data && <EventForm sports={sports.data} onClose={() => setM(null)} onSaved={events.reload} />}</div>;
}
