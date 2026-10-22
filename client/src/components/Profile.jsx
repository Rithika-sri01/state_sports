import { useState } from 'react';
import { api, fileUrl } from '../api';
import { useAuth } from '../auth';
import { useGet, Modal, Tabs, Table, Badge, Loading, fmt, Journey, ScorePanel, AlertDecision, Trend, Empty, Card, useSubmit, Msg, Field, List, cap, Ver } from './ui';

export function EvidenceGrid({ items }) {
  if (!items?.length) return <Empty>No evidence uploaded yet</Empty>;
  return <div className="vgrid">{items.map(e => <div className="card" key={e._id}>
    {e.videoUrl ? <video controls preload="metadata" src={fileUrl(e.videoUrl)} /> : <div className="empty">No video</div>}
    <b style={{ display: 'block', marginTop: 8 }}>{e.title}</b><small className="muted">{e.athlete?.name ? e.athlete.name + ' · ' : ''}{fmt(e.date)}{e.coach?.name ? ` · ${e.coach.name}` : ''}</small><p style={{ margin: '6px 0 0' }}>{e.description}</p></div>)}</div>;
}

export function CompetitionTable({ rows }) {
  const synth = rows?.some(t => t.result?.verificationStatus === 'synthetic-demo');
  return <div>{synth && <div className="alert info">Records marked <b>Synthetic demo</b> are placeholder data, not real results. A result can be marked <b>Verified</b> only with a source URL.</div>}
    <Table rows={rows} empty="No competition records" cols={[{ h: 'Competition', r: r => <b>{r.name}</b> }, { h: 'Date', r: r => fmt(r.date) }, { h: 'Event', r: r => r.result?.event || '—' }, { h: 'Result', r: r => (r.result ? r.result.result || '—' : <Badge>Upcoming</Badge>) }, { h: 'Rank', r: r => r.result?.position ?? '—' }, { h: 'Score', r: r => (r.result ? `${r.result.score}/100` : '—') }, { h: 'Verification', r: r => (r.result ? <Ver v={r.result.verificationStatus} /> : '—') }, { h: 'Source', r: r => (r.result?.sourceUrl ? <a href={r.result.sourceUrl} target="_blank" rel="noreferrer">Open</a> : '—') }]} /></div>;
}
const words = k => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
function StatsGrid({ stats }) {
  if (!stats) return <Empty>No sport statistics recorded yet</Empty>;
  return <div className="grid g4">{Object.entries(stats).map(([k, v]) => <div className="card" key={k}><div className="muted" style={{ fontSize: 12 }}>{words(k)}</div><b style={{ fontSize: 20 }}>{v ?? '—'}</b></div>)}</div>;
}
export function ProfileBody({ data, reload }) {
  const { user } = useAuth(), [tab, setTab] = useState('Scorecard'); const { athlete: a, scorecard: sc } = data;
  const hist = data.history.map(h => ({ name: fmt(h.computedAt).slice(0, 6), Overall: h.overall }));
  const open = data.promotions.some(p => ['Under Review', 'Further Review'].includes(p.status));
  return <div>
    <div className="sp mb"><div><h2>{a.name}</h2><span className="muted">{a.athleteId} · {a.sport?.name}{a.eventOrPosition ? ` · ${a.eventOrPosition}` : ''} · Coach: {a.coach?.name || 'Unassigned'} · {a.district}</span></div>
      <div className="right sp"><Badge tone="purple">{a.level?.name}</Badge><Badge tone={a.active ? 'green' : 'gray'}>{a.active ? 'Active' : 'Inactive'}</Badge><Badge>{sc.medicalStatus}</Badge></div></div>
    <Card title="Development lifecycle" className="mb"><Journey steps={data.journey} /></Card>
    <Tabs tabs={['Scorecard', 'Training', 'Skills & Evidence', 'Fitness', 'Tournaments', 'Sport stats', 'Medical', 'Achievements', 'Decisions']} value={tab} onChange={setTab} />
    {tab === 'Scorecard' && <div><AlertDecision /><div className="grid g2"><Card title="Development scorecard"><ScorePanel sc={sc} /></Card><Card title="Overall score progress"><Trend data={hist} keys={['Overall']} /></Card></div>
      {user.role === 'coach' && <Recommend a={a} sc={sc} open={open} reload={reload} />}</div>}
    {tab === 'Training' && <Table rows={data.training} cols={[{ h: 'Date', r: r => fmt(r.date) }, { h: 'Session', r: r => r.title }, { h: 'Type', r: r => r.type }, { h: 'Attended', r: r => <Badge tone={r.present ? 'green' : 'red'}>{r.present ? 'Present' : 'Absent'}</Badge> }, { h: 'Performance', r: r => (r.present ? `${r.performance}/100` : '—') }]} />}
    {tab === 'Skills & Evidence' && <div><Table rows={data.skills} cols={[{ h: 'Date', r: r => fmt(r.date) }, { h: 'Technical', r: r => r.technical }, { h: 'Tactical', r: r => r.tactical }, { h: 'Consistency', r: r => r.consistency }, { h: 'Performance', r: r => r.performance }, { h: 'Score', r: r => <b>{r.score}</b> }, { h: 'Coach remarks', r: r => r.remarks }]} /><h4 style={{ margin: '16px 0 10px' }}>Training evidence</h4><EvidenceGrid items={data.evidence} /></div>}
    {tab === 'Tournaments' && <CompetitionTable rows={data.tournaments} />}
    {tab === 'Sport stats' && <StatsGrid stats={data.stats} />}
    {tab === 'Fitness' && <Table rows={data.fitness} empty="No fitness tests yet" cols={[{ h: 'Date', r: r => fmt(r.date) }, { h: 'Score', r: r => <b>{r.score}/100</b> }, { h: 'Tests', r: r => (r.tests?.length ? r.tests.map(t => `${t.name}: ${t.result} ${t.unit}`).join(' · ') : `Speed ${r.speed}, Endurance ${r.endurance}, Strength ${r.strength}, Agility ${r.agility}, Flexibility ${r.flexibility}`) }]} />}
    {tab === 'Medical' && <div><Table rows={data.medical} cols={[{ h: 'Exam date', r: r => fmt(r.examDate) }, { h: 'Status', r: r => <Badge>{r.status}</Badge> }, { h: 'Ht / Wt', r: r => (r.heightCm ? `${r.heightCm} cm / ${r.weightKg} kg` : '—') }, { h: 'Blood', r: r => r.bloodGroup || '—' }, { h: 'Condition', r: r => r.condition || '—' }, { h: 'Restrictions', r: r => r.restrictions || '—' }, { h: 'Injuries', r: r => r.injuries?.length || 0 }, { h: 'Certificate', r: r => (r.certificateUrl ? <a href={fileUrl(r.certificateUrl)} target="_blank" rel="noreferrer">View</a> : '—') }]} /></div>}
    {tab === 'Achievements' && <List items={data.achievements} empty="No achievements yet" render={x => <><div className="p t-purple">🏅</div><div><b>{x.title}</b><br /><small>{x.category} · {fmt(x.date)}</small>{x.certificateUrl && <> · <a href={fileUrl(x.certificateUrl)} target="_blank" rel="noreferrer">Certificate</a></>}</div></>} />}
    {tab === 'Decisions' && <Table rows={data.decisions} cols={[{ h: 'Date', r: r => fmt(r.decidedAt) }, { h: 'Decision', r: r => <Badge>{r.decision}</Badge> }, { h: 'Level', r: r => `${r.fromLevel?.name} → ${r.toLevel?.name}` }, { h: 'Remarks', r: r => r.remarks }, { h: 'By', r: r => r.decidedBy?.name }]} empty="No committee decisions yet" />}
  </div>;
}

function Recommend({ a, sc, open, reload }) {
  const [text, setText] = useState('');
  const [go, st] = useSubmit(() => api.post('/promotions', { athlete: a._id, recommendation: text }), () => { setText(''); reload && reload(); });
  return <Card title="Coach recommendation" className="" >
    {open ? <div className="alert info">A promotion request is already with the Selection Committee.</div> : !sc.nextLevel ? <div className="alert info">Athlete is at the highest academy level.</div> :
      <><p className="muted" style={{ marginTop: 0 }}>The system re-checks eligibility on the server. Only eligible athletes can be recommended; the committee takes the final decision.</p><Msg st={st} />
        <Field label={`Recommendation for ${sc.nextLevel.name}`}><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Summarise why this athlete is ready, referring to evidence…" /></Field>
        <button className="btn purple" disabled={st.busy || text.length < 10} onClick={go}>Recommend for promotion review</button></>}
  </Card>;
}

export function ProfileModal({ id, onClose, onChange }) {
  const q = useGet(`/athletes/${id}/profile`);
  return <Modal title="Athlete development profile" size="wide" onClose={onClose}>{q.data ? <ProfileBody data={q.data} reload={() => { q.reload(); onChange && onChange(); }} /> : <Loading q={q} />}</Modal>;
}
