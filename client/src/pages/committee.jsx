import { useState } from 'react';
import { UserCheck, Eye, BadgeCheck, Send } from 'lucide-react';
import { api } from '../api';
import { ProfileModal, ProfileBody } from '../components/Profile';
import { useGet, PageHead, Kpi, Card, Bars, List, Badge, Loading, fmt, Table, Modal, Field, Select, useSubmit, Msg, Progress, CATS, cap, RadarCmp, Trend, AlertDecision, COLORS, scoreTone, Empty } from '../components/ui';

export function Dashboard() {
  const q = useGet('/dashboard'); const d = q.data; if (!d) return <Loading q={q} />;
  return <div><PageHead title="Committee Dashboard" sub="Eligibility, open requests and recent decisions" />
    <div className="grid g4 mb"><Kpi icon={UserCheck} label="Eligible Athletes" value={d.eligible} tone="green" sub="meet criteria — not auto-selected" /><Kpi icon={Eye} label="Under Review" value={d.underReview} tone="orange" /><Kpi icon={BadgeCheck} label="Selected" value={d.selected} tone="purple" /><Kpi icon={Send} label="Promotion Requests" value={d.promotionRequests} tone="blue" /></div>
    <div className="grid g2 mb"><Card title="Sport-wise performance (avg overall)"><Bars data={d.sportPerformance} keys={['avg']} max={100} colors={['#2563eb']} /></Card><Card title="Score distribution"><Bars data={d.distribution} keys={['count']} colors={['#7c3aed']} /></Card></div>
    <div className="grid g2"><Card title="Requests awaiting decision"><List items={d.open} empty="No open requests" render={x => <><div className="p t-orange">⏳</div><div><b>{x.athlete?.name}</b> → {x.toLevel?.name} <Badge>{x.status}</Badge><br /><small>{x.recommendation}</small></div></>} /></Card>
      <Card title="Recent decisions"><List items={d.recentDecisions} empty="No decisions yet" render={x => <><div className="p t-purple">⚖</div><div><b>{x.athlete?.name}</b> <Badge>{x.decision}</Badge><br /><small>{fmt(x.decidedAt)} · {x.remarks}</small></div></>} /></Card></div></div>;
}

export function Candidates() {
  const [filter, setFilter] = useState(''), [sport, setSport] = useState(''), [level, setLevel] = useState(''), [q, setQ] = useState('');
  const list = useGet('/athletes', { q, sport, level, active: 'true' }), sports = useGet('/sports'), levels = useGet('/levels'), reqs = useGet('/promotions', { status: 'open' }); const [view, setView] = useState(null);
  const open = new Map((reqs.data || []).map(r => [r.athlete?._id, r]));
  const rows = (list.data || []).filter(a => (filter === 'eligible' ? a.score?.eligible : filter === 'review' ? open.has(a._id) : true));
  return <div><PageHead title="Candidate Review & Scorecards" sub="Open any candidate for the full profile, scorecard, medical status, evidence and development gaps" />
    <Card><div className="filters"><input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} /><Select placeholder="All sports" options={(sports.data || []).map(s => ({ v: s._id, l: s.name }))} value={sport} onChange={e => setSport(e.target.value)} /><Select placeholder="All levels" options={(levels.data || []).map(s => ({ v: s._id, l: s.name }))} value={level} onChange={e => setLevel(e.target.value)} /><Select placeholder="All candidates" options={[{ v: 'eligible', l: 'Meets criteria' }, { v: 'review', l: 'Under committee review' }]} value={filter} onChange={e => setFilter(e.target.value)} /></div>
      <Table rows={rows} onRow={a => setView(a._id)} cols={[{ h: 'Athlete', r: a => <div><b>{a.name}</b><br /><small className="muted">{a.athleteId} · {a.sport?.name}</small></div> }, { h: 'Level', r: a => <Badge tone="purple">{a.level?.name}</Badge> },
        { h: 'Overall', r: a => (a.score ? <div style={{ width: 100 }}><b>{a.score.overall}</b><Progress value={a.score.overall} /></div> : '—') },
        ...CATS.map(c => ({ h: cap(c).slice(0, 5), r: a => (a.score ? <span style={{ color: a.score.gaps?.some(g => g.category === c) ? 'var(--orange)' : undefined, fontWeight: 600 }}>{a.score[c]}</span> : '—') })),
        { h: 'Medical', r: a => <Badge>{a.medicalStatus}</Badge> }, { h: 'Eligibility', r: a => <Badge tone={a.score?.eligible ? 'green' : 'gray'}>{a.score?.eligible ? 'Eligible' : 'Not yet'}</Badge> }, { h: 'Request', r: a => (open.get(a._id) ? <Badge>{open.get(a._id).status}</Badge> : '—') }]} /></Card>
    {view && <ProfileModal id={view} onClose={() => setView(null)} />}</div>;
}

export function Compare() {
  const ath = useGet('/athletes', { active: 'true' }); const [sel, setSel] = useState([]);
  const cmp = useGet(sel.length > 1 ? '/compare' : null, sel.length > 1 ? { ids: sel.join(',') } : undefined);
  const toggle = id => setSel(sel.includes(id) ? sel.filter(x => x !== id) : sel.length < 4 ? [...sel, id] : sel);
  const people = sel.length > 1 && Array.isArray(cmp.data) ? cmp.data.map(p => ({ ...p, name: p.athlete.name })) : [];
  const dates = [...new Set(people.flatMap(p => p.history.map(h => h.day)))].sort();
  return <div><PageHead title="Evidence / Performance Comparison" sub="Select 2–4 athletes to compare scores, evidence and development history" />
    <Card className="mb"><div className="chips">{(ath.data || []).map(a => <button key={a._id} className={`chip ${sel.includes(a._id) ? 'on' : ''}`} onClick={() => toggle(a._id)}>{a.name} <small>· {a.sport?.name}</small></button>)}</div></Card>
    {sel.length < 2 ? <Empty>Pick at least two athletes</Empty> : !people.length ? <Loading q={cmp} /> : <>
      <div className="grid g2 mb"><Card title="Category-wise radar"><RadarCmp people={people.map(p => ({ name: p.name, scorecard: p.scorecard }))} /></Card>
        <Card title="Category-wise scores"><Bars data={CATS.map(c => ({ name: cap(c), ...Object.fromEntries(people.map(p => [p.name, p.scorecard[c]])) }))} keys={people.map(p => p.name)} max={100} /></Card></div>
      <Card title="Side-by-side summary" className="mb"><div className="tbl-wrap"><table className="tbl cmp"><thead><tr><th></th>{people.map(p => <th key={p.name}>{p.name}</th>)}</tr></thead><tbody>
        <tr><td>Sport / level</td>{people.map(p => <td key={p.name}>{p.athlete.sport?.name} · {p.athlete.level?.name}</td>)}</tr>
        <tr><td>Overall score</td>{people.map(p => <td key={p.name}><b>{p.scorecard.overall}</b></td>)}</tr>
        {CATS.map(c => <tr key={c}><td>{cap(c)}</td>{people.map(p => <td key={p.name} style={{ color: p.scorecard.gaps.some(g => g.category === c) ? 'var(--orange)' : undefined }}>{p.scorecard[c]}{p.scorecard.gaps.some(g => g.category === c) ? ' ⚠' : ''}</td>)}</tr>)}
        <tr><td>Medical</td>{people.map(p => <td key={p.name}><Badge>{p.scorecard.medicalStatus}</Badge></td>)}</tr>
        <tr><td>Eligibility</td>{people.map(p => <td key={p.name}><Badge tone={p.scorecard.eligible ? 'green' : 'gray'}>{p.scorecard.eligible ? 'Meets criteria' : 'Not yet'}</Badge></td>)}</tr>
        <tr><td>Development gaps</td>{people.map(p => <td key={p.name}>{p.scorecard.gaps.map(g => cap(g.category)).join(', ') || 'None'}</td>)}</tr>
        <tr><td>Tournament results</td>{people.map(p => <td key={p.name}>{p.tournaments.filter(t => t.result).map(t => <div key={t._id}>{t.result.result} · {t.result.score}</div>)}</td>)}</tr>
        <tr><td>Skill assessments</td>{people.map(p => <td key={p.name}>{p.skills.length} (latest {p.skills[0]?.score ?? '—'})</td>)}</tr>
        <tr><td>Achievements</td>{people.map(p => <td key={p.name}>{p.achievements.length}</td>)}</tr></tbody></table></div></Card>
      <Card title="Development history (overall score)" className="mb"><Trend data={dates.map(d => ({ name: d.slice(5), ...Object.fromEntries(people.map(p => [p.name, p.history.find(h => h.day === d)?.overall ?? null])) }))} keys={people.map(p => p.name)} /></Card></>}</div>;
}

function Decide({ req, onClose, onSaved }) {
  const prof = useGet(`/athletes/${req.athlete._id}/profile`); const [decision, setDecision] = useState('Further Review'), [remarks, setRemarks] = useState('');
  const [go, st] = useSubmit(() => api.post('/decisions', { request: req._id, decision, remarks }), () => { onSaved(); onClose(); });
  return <Modal title={`Review — ${req.athlete.name}: ${req.fromLevel?.name} → ${req.toLevel?.name}`} size="wide" onClose={onClose}>
    <div className="alert info"><b>Coach recommendation:</b> {req.recommendation}</div>
    {prof.data ? <ProfileBody data={prof.data} reload={prof.reload} /> : <Loading q={prof} />}
    <Card title="Final decision" className="">
      <Msg st={st} /><AlertDecision />
      <div className="fgrid"><Field label="Decision *"><Select placeholder="" options={['Selected', 'Not Selected', 'Further Review']} value={decision} onChange={e => setDecision(e.target.value)} /></Field></div>
      <Field label="Committee remarks / reasoning * (min 10 chars)"><textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Record the evidence considered and the reasoning…" /></Field>
      <button className={`btn ${decision === 'Selected' ? 'green' : decision === 'Not Selected' ? 'danger' : ''}`} disabled={st.busy || remarks.trim().length < 10} onClick={go}>Submit final decision</button>
      {decision === 'Selected' && <span className="muted"> — selecting promotes the athlete to {req.toLevel?.name}.</span>}</Card></Modal>;
}
export function Decisions() {
  const reqs = useGet('/promotions', { status: 'open' }), dec = useGet('/decisions'); const [m, setM] = useState(null);
  const done = () => { reqs.reload(); dec.reload(); };
  return <div><PageHead title="Decisions & Promotion" sub="Final decisions are made by the committee after reviewing the complete evidence" />
    <Card title="Workflow" className="mb"><div className="flow"><span>Athlete Development</span><i>→</i><span>Development Score</span><i>→</i><span>Eligibility Check</span><i>→</i><span>Coach Recommendation</span><i>→</i><span>Committee Review</span><i>→</i><span>Final Decision</span><i>→</i><span>Promotion / Selection</span></div></Card>
    <Card title="Awaiting committee review" className="mb"><Table rows={reqs.data || []} empty="No requests awaiting a decision" cols={[{ h: 'Athlete', r: r => <div><b>{r.athlete?.name}</b><br /><small className="muted">{r.athlete?.sport?.name}</small></div> }, { h: 'Promotion', r: r => `${r.fromLevel?.name} → ${r.toLevel?.name}` }, { h: 'Overall', r: r => <b>{r.scorecard?.overall}</b> }, { h: 'Status', r: r => <Badge>{r.status}</Badge> }, { h: 'Coach recommendation', r: r => r.recommendation }, { h: 'Requested', r: r => fmt(r.createdAt) }, { h: '', r: r => <button className="btn sm purple" onClick={() => setM(r)}>Review & decide</button> }]} /></Card>
    <Card title="Decision history"><Table rows={dec.data || []} cols={[{ h: 'Date', r: r => fmt(r.decidedAt) }, { h: 'Athlete', r: r => <b>{r.athlete?.name}</b> }, { h: 'Decision', r: r => <Badge>{r.decision}</Badge> }, { h: 'Level', r: r => `${r.fromLevel?.name} → ${r.toLevel?.name}` }, { h: 'Remarks', r: r => r.remarks }, { h: 'Decided by', r: r => r.decidedBy?.name }]} /></Card>
    {m && <Decide req={m} onClose={() => setM(null)} onSaved={done} />}</div>;
}
