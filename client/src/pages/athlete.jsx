import { useState } from 'react';
import { Activity as ActivityIcon, Dumbbell, Target, Gauge, ShieldCheck } from 'lucide-react';
import { fileUrl } from '../api';
import { useGet, PageHead, Kpi, Card, Progress, List, Badge, Loading, fmt, Table, Tabs, Journey as JourneySteps, ScorePanel, AlertDecision, Trend, Bars, CATS, cap, scoreTone, Empty } from '../components/ui';
import { EvidenceGrid, CompetitionTable } from '../components/Profile';

export function Dashboard() {
  const q = useGet('/dashboard'); const d = q.data; if (!d) return <Loading q={q} />; const sc = d.scorecard;
  return <div><PageHead title={`Welcome, ${d.athlete.name.split(' ')[0]}`} sub={`${d.athlete.sport?.name} · ${d.athlete.athleteId}`}><Badge tone="purple">{d.athlete.level?.name}</Badge></PageHead>
    <div className="grid g4 mb"><Kpi icon={Gauge} label="Overall Development Score" value={sc.overall} tone="blue" /><Kpi icon={ActivityIcon} label="Fitness Score" value={d.fitnessScore} tone="green" /><Kpi icon={Dumbbell} label="Training Score" value={d.trainingScore} tone="purple" /><Kpi icon={Target} label="Skill Score" value={d.skillScore} tone="orange" /></div>
    <div className="grid g2 mb"><Card title={`Progress to next level${sc.nextLevel ? ` — ${sc.nextLevel.name}` : ''}`}>
      <div className="sp" style={{ justifyContent: 'space-between' }}><b>{sc.nextLevel ? `${d.progress}% of promotion criteria met` : 'Highest level reached'}</b><Badge tone="purple">Current: {d.athlete.level?.name}</Badge></div><div style={{ margin: '10px 0 14px' }}><Progress value={d.progress} tone="blue" /></div>
      {sc.checks.map((c, i) => <div key={i} className="sp" style={{ padding: '3px 0' }}><Badge tone={c.pass ? 'green' : 'orange'}>{c.pass ? '✓' : '…'}</Badge>{c.label} <small className="muted">{c.detail}</small></div>)}
      <p className="muted" style={{ marginBottom: 0 }}>Meeting the criteria makes you <i>eligible for review</i>; selection is decided by the committee.</p></Card>
      <Card title="Overall score trend"><Trend data={d.history.map(h => ({ name: fmt(h.computedAt).slice(0, 6), Overall: h.overall }))} keys={['Overall']} /></Card></div>
    <div className="grid g3"><Card title="Recent training"><List items={d.recentTraining} empty="No training yet" render={x => <><div className={`p t-${x.present ? 'green' : 'red'}`}>{x.present ? '✓' : '✕'}</div><div><b>{x.title}</b><br /><small>{fmt(x.date)} · {x.present ? `${x.performance}/100` : 'Absent'}</small></div></>} /></Card>
      <Card title="Upcoming tournaments"><List items={d.upcoming} empty="Nothing scheduled" render={x => <><div className="p t-purple">🏆</div><div><b>{x.name}</b><br /><small>{fmt(x.date)} · {x.venue}</small></div></>} /></Card>
      <Card title="Recent achievements"><List items={d.achievements} empty="No achievements yet" render={x => <><div className="p t-orange">🏅</div><div><b>{x.title}</b><br /><small>{x.category} · {fmt(x.date)}</small></div></>} /></Card></div></div>;
}

export function Journey() {
  const q = useGet('/athletes/me/profile'); const d = q.data; if (!d) return <Loading q={q} />; const a = d.athlete;
  return <div><PageHead title="My Profile & Development Journey" sub="Your complete lifecycle from registration to selection" />
    <div className="grid g23 mb"><Card title="Profile"><div style={{ lineHeight: 2 }}><b style={{ fontSize: 18 }}>{a.name}</b><br />ID: {a.athleteId}<br />Sport: {a.sport?.name}<br />Academy level: <Badge tone="purple">{a.level?.name}</Badge><br />Coach: {a.coach?.name || '—'}<br />District: {a.district || '—'}<br />Registered: {fmt(a.registeredAt)}<br />Medical: <Badge>{d.scorecard.medicalStatus}</Badge></div></Card>
      <Card title="Development lifecycle"><JourneySteps steps={d.journey} vertical /></Card></div>
    {d.decisions.length > 0 && <Card title="Committee decisions"><Table rows={d.decisions} cols={[{ h: 'Date', r: r => fmt(r.decidedAt) }, { h: 'Decision', r: r => <Badge>{r.decision}</Badge> }, { h: 'Level', r: r => `${r.fromLevel?.name} → ${r.toLevel?.name}` }, { h: 'Remarks', r: r => r.remarks }]} /></Card>}</div>;
}

export function Scorecard() {
  const q = useGet('/athletes/me/profile'); const d = q.data; if (!d) return <Loading q={q} />; const sc = d.scorecard;
  return <div><PageHead title="My Development Scorecard" sub="Multi-factor, weighted — a decision-support tool, not an automatic selection" /><AlertDecision />
    <div className="grid g2 mb"><Card title="Scorecard"><ScorePanel sc={sc} /></Card>
      <Card title="Progress over time"><Trend data={d.history.map(h => ({ name: fmt(h.computedAt).slice(0, 6), ...Object.fromEntries(CATS.map(c => [cap(c), h[c]])), Overall: h.overall }))} keys={['Overall', ...CATS.map(cap)]} colors={['#0f1b3d', '#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#ec4899']} /></Card></div>
    <Card title="Recommended improvement areas">{sc.gaps.length ? sc.gaps.map(g => <div key={g.category} className="alert warn"><b>{cap(g.category)}: {g.score} (target {g.target})</b><br />{g.action}</div>) : <div className="alert ok">You meet every category target for the next level. Keep your consistency up.</div>}</Card></div>;
}

export function Activity() {
  const q = useGet('/athletes/me/profile'); const [tab, setTab] = useState('Training'); const d = q.data; if (!d) return <Loading q={q} />;
  return <div><PageHead title="Training / Tournaments / Achievements" sub="History, results, certificates and evidence" /><Card><Tabs tabs={['Training', 'Tournaments', 'Achievements & certificates', 'Evidence']} value={tab} onChange={setTab} />
    {tab === 'Training' && <><div className="mb"><Bars data={d.training.slice(0, 10).reverse().map(t => ({ name: fmt(t.date).slice(0, 6), Performance: t.performance }))} keys={['Performance']} max={100} colors={['#7c3aed']} /></div><Table rows={d.training} cols={[{ h: 'Date', r: r => fmt(r.date) }, { h: 'Session', r: r => r.title }, { h: 'Type', r: r => r.type }, { h: 'Coach', r: r => r.coach }, { h: 'Attendance', r: r => <Badge tone={r.present ? 'green' : 'red'}>{r.present ? 'Present' : 'Absent'}</Badge> }, { h: 'Performance', r: r => (r.present ? `${r.performance}/100` : '—') }, { h: 'Remarks', r: r => r.remarks }]} /></>}
    {tab === 'Tournaments' && <CompetitionTable rows={d.tournaments} />}
    {tab.startsWith('Achievements') && <List items={d.achievements} empty="No achievements recorded" render={x => <><div className="p t-orange">🏅</div><div><b>{x.title}</b><br /><small>{x.category} · {fmt(x.date)}</small><br />{x.description}{x.certificateUrl && <> <a href={fileUrl(x.certificateUrl)} target="_blank" rel="noreferrer">Certificate</a></>}</div></>} />}
    {tab === 'Evidence' && <EvidenceGrid items={d.evidence} />}</Card></div>;
}
