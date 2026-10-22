import { useEffect, useState } from 'react';
import { Users, Dumbbell, ClipboardList, Send, Plus } from 'lucide-react';
import { api, fileUrl } from '../api';
import AthleteList from '../components/AthleteList';
import { EvidenceGrid } from '../components/Profile';
import { useGet, PageHead, Kpi, Card, Bars, Trend, List, Badge, Loading, fmt, Table, Tabs, Modal, Field, Select, useForm, useSubmit, Msg, dInput, Progress, Empty } from '../components/ui';

export function Dashboard() {
  const q = useGet('/dashboard'); const d = q.data; if (!d) return <Loading q={q} />;
  return <div><PageHead title="Coach Dashboard" sub="Your athletes, training and pending work" />
    <div className="grid g4 mb"><Kpi icon={Users} label="My Athletes" value={d.myAthletes} /><Kpi icon={Dumbbell} label="Today's Training" value={d.todaysTraining} tone="green" /><Kpi icon={ClipboardList} label="Pending Assessments" value={d.pendingAssessments} tone="orange" /><Kpi icon={Send} label="Promotion Requests" value={d.promotionRequests} tone="purple" /></div>
    <div className="grid g2 mb"><Card title="Training summary (last 6 weeks)"><Bars data={d.weeks} x="week" keys={['sessions']} /><small className="muted">Sessions per week · average attendance: {d.weeks.map(w => w.attendance + '%').join(' · ')}</small></Card>
      <Card title="Athlete performance overview (overall score)"><Bars data={d.performance} keys={['overall']} max={100} colors={['#7c3aed']} /></Card></div>
    <div className="grid g3">
      <Card title="Today's training"><List items={d.today} empty="No sessions scheduled today" render={x => <><div className="p t-green">🏃</div><div><b>{x.title}</b><br />{x.type} · {x.durationMin} min <Badge>{x.status}</Badge></div></>} /></Card>
      <Card title="Recent training sessions"><List items={d.recentSessions} render={x => <><div className="p t-blue">✓</div><div><b>{x.title}</b><br />{fmt(x.date)} · {x.present}/{x.total} present</div></>} /></Card>
      <Card title="Pending assessments"><List items={d.pending.slice(0, 6)} empty="All athletes assessed recently" render={x => <><div className="p t-orange">!</div><div><b>{x.name}</b><br /><small>{x.lastAssessed ? `Last assessed ${fmt(x.lastAssessed)}` : 'Never assessed'}</small></div></>} /></Card>
    </div>
    {d.requests.length > 0 && <Card title="Promotion requests with the committee" className="mb"><List items={d.requests} render={x => <><div className="p t-purple">↑</div><div><b>{x.athlete?.name}</b> → {x.toLevel?.name} <Badge>{x.status}</Badge></div></>} /></Card>}</div>;
}
export const MyAthletes = () => <AthleteList title="My Athletes" sub="Open an athlete to see the complete development profile and recommend promotion" />;

function SessionForm({ athletes, session, onClose, onSaved }) {
  const edit = !!session;
  const [f, b] = useForm(edit ? { ...session, date: dInput(session.date) } : { type: 'Technical', durationMin: 90, date: dInput(new Date()), status: 'Completed' });
  const [rows, setRows] = useState(edit ? session.attendance.map(a => ({ athlete: a.athlete._id, name: a.athlete.name, present: a.present, performance: a.performance, remarks: a.remarks || '' })) : []);
  const has = id => rows.some(r => r.athlete === id);
  const toggle = a => setRows(has(a._id) ? rows.filter(r => r.athlete !== a._id) : [...rows, { athlete: a._id, name: a.name, present: true, performance: 70, remarks: '' }]);
  const upd = (id, k, v) => setRows(rows.map(r => (r.athlete === id ? { ...r, [k]: v } : r)));
  const [go, st] = useSubmit(() => { const body = { title: f.title, type: f.type, date: f.date, durationMin: +f.durationMin, remarks: f.remarks, status: f.status, attendance: rows.map(r => ({ athlete: r.athlete, present: r.present, performance: r.present ? +r.performance : 0, remarks: r.remarks })) }; return edit ? api.patch(`/training/${session._id}`, body) : api.post('/training', body); }, () => { onSaved(); onClose(); });
  return <Modal title={edit ? 'Session & attendance' : 'Create training session'} size="mid" onClose={onClose}><Msg st={st} />
    <div className="fgrid"><Field label="Title *"><input {...b('title')} /></Field><Field label="Training type *"><Select options={['Technical', 'Tactical', 'Fitness', 'Match Practice', 'Recovery']} {...b('type')} /></Field><Field label="Date *"><input type="date" {...b('date')} /></Field><Field label="Duration (min) *"><input type="number" min="10" {...b('durationMin')} /></Field><Field label="Status"><Select options={['Completed', 'Scheduled']} {...b('status')} /></Field></div>
    <Field label="Training remarks"><textarea {...b('remarks')} /></Field>
    {!edit && <Field label="Select athletes / group"><div className="chips">{athletes.map(a => <button type="button" key={a._id} className={`chip ${has(a._id) ? 'on' : ''}`} onClick={() => toggle(a)}>{a.name}</button>)}<button type="button" className="chip" onClick={() => setRows(athletes.map(a => ({ athlete: a._id, name: a.name, present: true, performance: 70, remarks: '' })))}>Select all</button></div></Field>}
    {rows.length > 0 && <Table rows={rows.map(r => ({ ...r, _id: r.athlete }))} cols={[{ h: 'Athlete', r: r => r.name }, { h: 'Present', r: r => <input type="checkbox" checked={r.present} onChange={e => upd(r.athlete, 'present', e.target.checked)} /> }, { h: 'Performance', r: r => <input style={{ width: 80 }} type="number" min="0" max="100" disabled={!r.present} value={r.performance} onChange={e => upd(r.athlete, 'performance', e.target.value)} /> }, { h: 'Remarks', r: r => <input value={r.remarks} onChange={e => upd(r.athlete, 'remarks', e.target.value)} /> }]} />}
    <div style={{ marginTop: 14 }}><button className="btn" disabled={st.busy || !rows.length} onClick={go}>{edit ? 'Save attendance' : 'Create session'}</button></div></Modal>;
}
export function Training() {
  const q = useGet('/training'), mine = useGet('/athletes'); const [m, setM] = useState(null);
  return <div><PageHead title="Training Sessions & Attendance" sub="Plan sessions, record attendance and per-athlete performance"><button className="btn" onClick={() => setM({})}><Plus size={16} /> New session</button></PageHead>
    <Card><Table rows={q.data || []} onRow={s => setM(s)} cols={[{ h: 'Date', r: s => fmt(s.date) }, { h: 'Session', r: s => <b>{s.title}</b> }, { h: 'Type', r: s => s.type }, { h: 'Duration', r: s => `${s.durationMin} min` }, { h: 'Status', r: s => <Badge>{s.status}</Badge> }, { h: 'Attendance', r: s => { const p = s.attendance.filter(a => a.present).length; return `${p}/${s.attendance.length}`; } }, { h: 'Avg performance', r: s => { const p = s.attendance.filter(a => a.present); return p.length ? Math.round(p.reduce((t, a) => t + a.performance, 0) / p.length) : '—'; } }]} /></Card>
    {m && mine.data && <SessionForm athletes={mine.data.filter(a => a.active)} session={m._id ? m : null} onClose={() => setM(null)} onSaved={q.reload} />}</div>;
}

function AthletePick({ b, athletes }) { return <Field label="Athlete *"><Select options={athletes.map(a => ({ v: a._id, l: `${a.name} (${a.athleteId})` }))} {...b('athlete')} /></Field>; }
const Slider = ({ label, b }) => <Field label={`${label} (0-100) *`}><input type="number" min="0" max="100" {...b} /></Field>;

function VideoPreview({ file }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!file) return null;
  return <div style={{ margin: '10px 0 16px' }}>
    <div><b>{file.name}</b> <small className="muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</small></div>
    {url && <video src={url} controls preload="metadata" style={{ display: 'block', width: '100%', maxHeight: 280, marginTop: 8, borderRadius: 8, background: '#111' }} />}
  </div>;
}

export function Assessment() {
  const [tab, setTab] = useState('Skill assessment'), ath = useGet('/athletes'), skills = useGet('/skills'), ev = useGet('/evidence'), fit = useGet('/fitness'), tours = useGet('/tournaments');
  const A = ath.data || [];
  const [sf, sb, setS] = useForm({ date: dInput(new Date()) }); const [saveSkill, sst] = useSubmit(() => api.post('/skills', sf), () => { skills.reload(); setS({ date: dInput(new Date()) }); });
  const [ff, fb, setF] = useForm({ date: dInput(new Date()) }); const [saveFit, fst] = useSubmit(() => api.post('/fitness', ff), () => { fit.reload(); setF({ date: dInput(new Date()) }); });
  const [ef, eb, setE] = useForm({}); const [file, setFile] = useState(null); const [saveEv, est] = useSubmit(() => { const fd = new FormData(); Object.entries(ef).forEach(([k, v]) => fd.append(k, v)); if (file) fd.append('video', file); return api.post('/evidence', fd); }, () => { ev.reload(); setE({}); setFile(null); });
  const [tf, tb, setT] = useForm({}); const [saveT, tst] = useSubmit(() => api.post(`/tournaments/${tf.tournament}/results`, Object.fromEntries(Object.entries({ ...tf, score: +tf.score, position: tf.position ? +tf.position : undefined }).filter(([, v]) => v !== '' && v !== undefined))), () => { tours.reload(); setT({}); });
  return <div><PageHead title="Skill / Performance Assessment & Evidence" sub="Evaluate athletes and attach evidence to their development history" />
    <Tabs tabs={['Skill assessment', 'Training evidence', 'Fitness assessment', 'Tournament results']} value={tab} onChange={setTab} />
    {tab === 'Skill assessment' && <div className="grid g23"><Card title="New skill assessment"><Msg st={sst} /><AthletePick b={sb} athletes={A} /><div className="fgrid"><Slider label="Technical skill" b={sb('technical')} /><Slider label="Tactical skill" b={sb('tactical')} /><Slider label="Consistency" b={sb('consistency')} /><Slider label="Performance score" b={sb('performance')} /></div><Field label="Assessment date"><input type="date" {...sb('date')} /></Field><Field label="Coach remarks"><textarea {...sb('remarks')} /></Field><button className="btn" disabled={sst.busy} onClick={saveSkill}>Save assessment</button></Card>
      <Card title="Assessment history"><Table rows={skills.data || []} cols={[{ h: 'Date', r: r => fmt(r.date) }, { h: 'Athlete', r: r => r.athlete?.name }, { h: 'Tech', r: r => r.technical }, { h: 'Tact', r: r => r.tactical }, { h: 'Cons', r: r => r.consistency }, { h: 'Perf', r: r => r.performance }, { h: 'Score', r: r => <b>{r.score}</b> }, { h: 'Remarks', r: r => r.remarks }]} /></Card></div>}
    {tab === 'Training evidence' && <div className="grid g23"><Card title="Upload evidence"><Msg st={est} /><AthletePick b={eb} athletes={A} /><Field label="Title *"><input {...eb('title')} /></Field><Field label="Evidence description"><textarea {...eb('description')} /></Field><Field label="Training video (mp4/webm, ≤150MB)"><input type="file" accept="video/*" onChange={e => setFile(e.target.files[0] || null)} /></Field><VideoPreview file={file} /><p className="muted">Evidence is linked to the athlete's latest skill assessment and appears in their development history and committee review.</p><button className="btn" disabled={est.busy} onClick={saveEv}>Upload evidence</button></Card><Card title="Uploaded evidence"><EvidenceGrid items={ev.data} /></Card></div>}
    {tab === 'Fitness assessment' && <div className="grid g23"><Card title="Record fitness test"><Msg st={fst} /><AthletePick b={fb} athletes={A} /><div className="fgrid"><Slider label="Speed" b={fb('speed')} /><Slider label="Endurance" b={fb('endurance')} /><Slider label="Strength" b={fb('strength')} /><Slider label="Agility" b={fb('agility')} /><Slider label="Flexibility" b={fb('flexibility')} /></div><Field label="Date"><input type="date" {...fb('date')} /></Field><button className="btn" disabled={fst.busy} onClick={saveFit}>Save fitness test</button></Card>
      <Card title="Fitness history"><Table rows={fit.data || []} cols={[{ h: 'Date', r: r => fmt(r.date) }, { h: 'Athlete', r: r => r.athlete?.name }, { h: 'Speed', r: r => r.speed }, { h: 'Endur.', r: r => r.endurance }, { h: 'Str.', r: r => r.strength }, { h: 'Agil.', r: r => r.agility }, { h: 'Flex.', r: r => r.flexibility }, { h: 'Score', r: r => <b>{r.score}</b> }]} /></Card></div>}
    {tab === 'Tournament results' && <div className="grid g23"><Card title="Record tournament result"><Msg st={tst} /><Field label="Tournament *"><Select options={(tours.data || []).filter(t => t.sport && A.some(a => a.sport?._id === t.sport._id)).map(t => ({ v: t._id, l: `${t.name} (${fmt(t.date)})` }))} {...tb('tournament')} /></Field><AthletePick b={tb} athletes={A} /><div className="fgrid"><Slider label="Performance score" b={tb('score')} /><Field label="Position"><input type="number" min="1" {...tb('position')} /></Field></div><div className="fgrid"><Field label="Event"><input {...tb('event')} /></Field><Field label="Result"><input placeholder="12.95 s / W 3-1" {...tb('result')} /></Field><Field label="Unit"><input placeholder="s, m, goals…" {...tb('unit')} /></Field><Field label="Verification"><Select placeholder="Unverified" options={[{ v: 'verified', l: 'Verified (needs source URL)' }, { v: 'synthetic-demo', l: 'Synthetic demo' }]} {...tb('verificationStatus')} /></Field></div><Field label="Source URL"><input type="url" placeholder="https://…" {...tb('sourceUrl')} /></Field><Field label="Remarks"><input {...tb('remarks')} /></Field><button className="btn" disabled={tst.busy || !tf.tournament} onClick={saveT}>Save result</button></Card>
      <Card title="Tournaments"><Table rows={(tours.data || []).filter(t => t.sport && A.some(a => a.sport?._id === t.sport._id))} cols={[{ h: 'Tournament', r: t => <b>{t.name}</b> }, { h: 'Date', r: t => fmt(t.date) }, { h: 'Level', r: t => t.level }, { h: 'Results', r: t => t.results?.length || 0 }]} /></Card></div>}</div>;
}
