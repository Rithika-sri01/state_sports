import { useState } from 'react';
import { ShieldAlert, ShieldCheck, ClipboardCheck, HeartPulse } from 'lucide-react';
import { api, fileUrl } from '../api';
import { useGet, PageHead, Kpi, Card, Donut, List, Badge, Loading, fmt, Table, Tabs, Modal, Field, Select, useForm, useSubmit, Msg, dInput, Empty } from '../components/ui';

export function Dashboard() {
  const q = useGet('/dashboard'); const d = q.data; if (!d) return <Loading q={q} />;
  return <div><PageHead title="Medical Dashboard" sub="Verification workload, clearances and injuries" />
    <div className="grid g4 mb"><Kpi icon={ClipboardCheck} label="Pending Medical Verification" value={d.pending} tone="orange" /><Kpi icon={ShieldCheck} label="Cleared Athletes" value={d.cleared} tone="green" /><Kpi icon={HeartPulse} label="Medical Reviews" value={d.underReview} tone="purple" /><Kpi icon={ShieldAlert} label="Injured Athletes" value={d.injured} tone="red" /></div>
    <div className="grid g2"><Card title="Medical status (latest per athlete)"><Donut data={d.chart} /></Card>
      <Card title="Recent medical updates"><List items={d.recent} render={x => <><div className="p t-blue">+</div><div><b>{x.athlete?.name}</b> <Badge>{x.status}</Badge><br /><small>{x.condition || x.remarks || 'Record updated'} · {fmt(x.updatedAt)}</small></div></>} /></Card></div></div>;
}

function History({ id, onClose }) {
  const q = useGet('/medical', { athlete: id }); const d = q.data;
  return <Modal title="Medical history" size="mid" onClose={onClose}>{!d ? <Loading q={q} /> : <>
    <h4 style={{ marginBottom: 8 }}>Examinations</h4><Table rows={d} cols={[{ h: 'Date', r: r => fmt(r.examDate) }, { h: 'Status', r: r => <Badge>{r.status}</Badge> }, { h: 'Ht/Wt', r: r => (r.heightCm ? `${r.heightCm}cm / ${r.weightKg}kg` : '—') }, { h: 'Blood', r: r => r.bloodGroup || '—' }, { h: 'Condition', r: r => r.condition || '—' }, { h: 'Restrictions', r: r => r.restrictions || '—' }, { h: 'Observations / remarks', r: r => [r.observations, r.remarks].filter(Boolean).join(' · ') }, { h: 'Certificate', r: r => (r.certificateUrl ? <a href={fileUrl(r.certificateUrl)} target="_blank" rel="noreferrer">Open</a> : '—') }]} />
    <h4 style={{ margin: '16px 0 8px' }}>Injury history</h4><Table rows={d.flatMap(r => r.injuries.map(i => ({ ...i })))} empty="No injuries recorded" cols={[{ h: 'Date', r: i => fmt(i.date) }, { h: 'Injury', r: i => i.type }, { h: 'Body part', r: i => i.bodyPart }, { h: 'Severity', r: i => <Badge tone={i.severity === 'Severe' ? 'red' : i.severity === 'Moderate' ? 'orange' : 'blue'}>{i.severity}</Badge> }, { h: 'Status', r: i => <Badge tone={i.status === 'Active' ? 'red' : undefined}>{i.status}</Badge> }]} /></>}</Modal>;
}
export function Records() {
  const [q, setQ] = useState(''), [st, setSt] = useState(''), list = useGet('/medical/overview', { q }), [view, setView] = useState(null);
  const rows = (list.data || []).filter(a => !st || a.medicalStatus === st);
  return <div><PageHead title="Athlete Medical Records" sub="Search athletes and review medical history and certificates" />
    <Card><div className="filters"><input placeholder="Search athlete…" value={q} onChange={e => setQ(e.target.value)} /><Select placeholder="Any status" options={['Pending', 'Cleared', 'Failed', 'Under Review', 'None']} value={st} onChange={e => setSt(e.target.value)} /></div>
      <Table rows={rows} onRow={a => setView(a._id)} cols={[{ h: 'Athlete', r: a => <div><b>{a.name}</b><br /><small className="muted">{a.athleteId}</small></div> }, { h: 'Sport', r: a => a.sport?.name }, { h: 'Level', r: a => a.level?.name }, { h: 'Medical status', r: a => <Badge>{a.medicalStatus}</Badge> }, { h: 'Last examination', r: a => fmt(a.lastExam) }]} /></Card>
    {view && <History id={view} onClose={() => setView(null)} />}</div>;
}

export function Examination() {
  const ath = useGet('/athletes'), recent = useGet('/medical'); const [f, b, set] = useForm({ examDate: dInput(new Date()), bloodGroup: 'O+' }); const [file, setFile] = useState(null);
  const [go, st] = useSubmit(() => { const fd = new FormData(); Object.entries(f).forEach(([k, v]) => fd.append(k, v)); if (file) fd.append('certificate', file); return api.post('/medical', fd); }, () => { recent.reload(); set({ examDate: dInput(new Date()), bloodGroup: 'O+' }); setFile(null); });
  return <div><PageHead title="Medical Examination" sub="Record examination details. New records start as Pending until you decide on clearance." />
    <div className="grid g23"><Card title="Record examination"><Msg st={st} />
      <Field label="Athlete *"><Select options={(ath.data || []).map(a => ({ v: a._id, l: `${a.name} (${a.athleteId})` }))} {...b('athlete')} /></Field>
      <div className="fgrid"><Field label="Examination date *"><input type="date" {...b('examDate')} /></Field><Field label="Blood group *"><Select options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} {...b('bloodGroup')} /></Field><Field label="Height (cm) *"><input type="number" {...b('heightCm')} /></Field><Field label="Weight (kg) *"><input type="number" {...b('weightKg')} /></Field></div>
      <Field label="Medical condition *"><input placeholder="e.g. Fit for sports training" {...b('condition')} /></Field><Field label="Physical observations"><textarea {...b('observations')} /></Field><Field label="Medical remarks"><textarea {...b('remarks')} /></Field><Field label="Restrictions"><input placeholder="None / Avoid high-impact drills…" {...b('restrictions')} /></Field>
      <Field label="Certificate / document (PDF or image)"><input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files[0])} /></Field>
      <button className="btn" disabled={st.busy} onClick={go}>Save examination</button></Card>
      <Card title="Recent examinations"><Table rows={(recent.data || []).slice(0, 12)} cols={[{ h: 'Date', r: r => fmt(r.examDate) }, { h: 'Athlete', r: r => r.athlete?.name }, { h: 'Condition', r: r => r.condition }, { h: 'Status', r: r => <Badge>{r.status}</Badge> }]} /></Card></div></div>;
}

function Decide({ rec, onClose, onSaved }) {
  const [status, setStatus] = useState('Cleared'), [remarks, setRemarks] = useState(rec.remarks || '');
  const [go, st] = useSubmit(() => api.patch(`/medical/${rec._id}/status`, { status, remarks }), () => { onSaved(); onClose(); });
  return <Modal title={`Clearance — ${rec.athlete?.name}`} onClose={onClose}><Msg st={st} /><p className="muted" style={{ marginTop: 0 }}>Exam {fmt(rec.examDate)} · {rec.condition || 'no condition noted'}</p>
    <Field label="Decision"><Select placeholder="" options={[{ v: 'Cleared', l: 'Approve clearance' }, { v: 'Failed', l: 'Reject clearance' }, { v: 'Under Review', l: 'Send for further review' }]} value={status} onChange={e => setStatus(e.target.value)} /></Field>
    <Field label={`Remarks ${status !== 'Cleared' ? '*' : ''}`}><textarea value={remarks} onChange={e => setRemarks(e.target.value)} /></Field><button className={`btn ${status === 'Failed' ? 'danger' : status === 'Cleared' ? 'green' : ''}`} disabled={st.busy} onClick={go}>Confirm</button></Modal>;
}
export function Clearance() {
  const [tab, setTab] = useState('Clearance queue'), [filter, setFilter] = useState('open'), recs = useGet('/medical'), inj = useGet('/injuries'), ath = useGet('/athletes'); const [m, setM] = useState(null);
  const [f, b, set] = useForm({ severity: 'Minor', date: dInput(new Date()) }); const [add, st] = useSubmit(() => api.post('/injuries', f), () => { inj.reload(); recs.reload(); set({ severity: 'Minor', date: dInput(new Date()) }); });
  const latest = new Map(); (recs.data || []).forEach(r => { const k = r.athlete?._id; if (k && !latest.has(k)) latest.set(k, r); });
  const rows = [...latest.values()].filter(r => (filter === 'open' ? ['Pending', 'Under Review'].includes(r.status) : filter === 'all' ? true : r.status === filter));
  const upd = async (i, status) => { await api.patch(`/injuries/${i.recordId}/${i._id}`, { status }); inj.reload(); };
  return <div><PageHead title="Medical Clearance & Injury Alerts" sub="Approve or reject clearance, record injuries and track recovery" />
    <Tabs tabs={['Clearance queue', 'Injury alerts']} value={tab} onChange={setTab} />
    {tab === 'Clearance queue' && <Card><div className="filters"><Select placeholder="" options={[{ v: 'open', l: 'Needs action (Pending / Under Review)' }, { v: 'Cleared', l: 'Verified / Cleared' }, { v: 'Failed', l: 'Failed' }, { v: 'all', l: 'All (latest per athlete)' }]} value={filter} onChange={e => setFilter(e.target.value)} /></div>
      <Table rows={rows} cols={[{ h: 'Athlete', r: r => <div><b>{r.athlete?.name}</b><br /><small className="muted">{r.athlete?.athleteId} · {r.athlete?.sport?.name}</small></div> }, { h: 'Exam date', r: r => fmt(r.examDate) }, { h: 'Condition', r: r => r.condition || '—' }, { h: 'Status', r: r => <Badge>{r.status}</Badge> }, { h: 'Remarks', r: r => r.remarks || '—' }, { h: '', r: r => <button className="btn sm" onClick={() => setM(r)}>Review</button> }]} empty="Nothing waiting for action" /></Card>}
    {tab === 'Injury alerts' && <div className="grid g23"><Card title="Record injury"><Msg st={st} /><Field label="Athlete *"><Select options={(ath.data || []).map(a => ({ v: a._id, l: a.name }))} {...b('athlete')} /></Field><Field label="Injury *"><input placeholder="e.g. Ankle sprain" {...b('type')} /></Field><div className="fgrid"><Field label="Body part"><input {...b('bodyPart')} /></Field><Field label="Severity *"><Select options={['Minor', 'Moderate', 'Severe']} {...b('severity')} /></Field></div><Field label="Date"><input type="date" {...b('date')} /></Field><Field label="Notes"><textarea {...b('notes')} /></Field><button className="btn danger" disabled={st.busy} onClick={add}>Record injury</button></Card>
      <Card title="Injury history & alerts"><Table rows={inj.data || []} cols={[{ h: 'Date', r: i => fmt(i.date) }, { h: 'Athlete', r: i => i.athlete?.name }, { h: 'Injury', r: i => <div>{i.type}<br /><small className="muted">{i.bodyPart}</small></div> }, { h: 'Severity', r: i => <Badge tone={i.severity === 'Severe' ? 'red' : i.severity === 'Moderate' ? 'orange' : 'blue'}>{i.severity}</Badge> }, { h: 'Status', r: i => <Badge tone={i.status === 'Active' ? 'red' : undefined}>{i.status}</Badge> }, { h: '', r: i => i.status !== 'Recovered' && <div className="act">{i.status === 'Active' && <button className="btn ghost sm" onClick={() => upd(i, 'Recovering')}>Recovering</button>}<button className="btn green sm" onClick={() => upd(i, 'Recovered')}>Recovered</button></div> }]} /></Card></div>}
    {m && <Decide rec={m} onClose={() => setM(null)} onSaved={() => { recs.reload(); }} />}</div>;
}
