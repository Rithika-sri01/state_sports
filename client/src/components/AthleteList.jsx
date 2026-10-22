import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api';
import { useGet, Table, Badge, Select, Modal, Field, useForm, useSubmit, Msg, Progress, dInput, Card, PageHead, Loading } from './ui';
import { ProfileModal } from './Profile';

function AthleteForm({ athlete, sports, levels, coaches, onClose, onSaved }) {
  const edit = !!athlete;
  const [f, b] = useForm(edit ? { ...athlete, sport: athlete.sport?._id || athlete.sport, coach: athlete.coach?._id || '', dob: dInput(athlete.dob) } : { gender: 'Male' });
  const [go, st] = useSubmit(() => (edit ? api.put(`/athletes/${athlete._id}`, f) : api.post('/athletes', f)), () => { onSaved(); onClose(); });
  return <Modal title={edit ? 'Edit athlete' : 'Register athlete'} onClose={onClose}><Msg st={st} />
    <div className="fgrid"><Field label="Full name *"><input {...b('name')} /></Field><Field label="Date of birth *"><input type="date" {...b('dob')} /></Field>
      <Field label="Gender *"><Select options={['Male', 'Female', 'Other']} {...b('gender')} /></Field><Field label="Phone"><input {...b('phone')} /></Field>
      <Field label="District"><input {...b('district')} /></Field><Field label="Guardian"><input {...b('guardian')} /></Field>
      <Field label="Sport *"><Select options={sports.map(s => ({ v: s._id, l: s.name }))} {...b('sport')} /></Field><Field label="Event / position"><input placeholder="e.g. 100 m, Forward, Singles" {...b('eventOrPosition')} /></Field>
      {!edit && <Field label="Starting level *"><Select options={levels.map(s => ({ v: s._id, l: s.name }))} {...b('level')} /></Field>}
      <Field label="Assigned coach"><Select placeholder="Unassigned" options={coaches.map(c => ({ v: c._id, l: c.name }))} {...b('coach')} /></Field></div>
    {!edit && <div className="fgrid"><Field label="Login email (optional)"><input type="email" {...b('email')} /></Field><Field label="Login password (min 8)"><input type="password" {...b('password')} /></Field></div>}
    {edit && <p className="muted">Academy level can only change through the promotion workflow.</p>}
    <button className="btn" disabled={st.busy} onClick={go}>{edit ? 'Save changes' : 'Register athlete'}</button></Modal>;
}

export default function AthleteList({ manage, title, sub }) {
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || ''), [sport, setSport] = useState(''), [level, setLevel] = useState(''), [active, setActive] = useState('');
  const sports = useGet('/sports'), levels = useGet('/levels'), coaches = useGet(manage ? '/coaches' : '/sports');
  const list = useGet('/athletes', { q: sp.get('q') && q === sp.get('q') ? q : q, sport, level, active });
  const [view, setView] = useState(null), [form, setForm] = useState(null);
  const toggle = async a => { await api.patch(`/athletes/${a._id}/status`, { active: !a.active }); list.reload(); };
  return <div>
    <PageHead title={title} sub={sub}>{manage && <button className="btn" onClick={() => setForm({})}><Plus size={16} /> Add athlete</button>}</PageHead>
    <Card>
      <div className="filters"><input placeholder="Search name or ID…" value={q} onChange={e => setQ(e.target.value)} />
        <Select placeholder="All sports" options={(sports.data || []).map(s => ({ v: s._id, l: s.name }))} value={sport} onChange={e => setSport(e.target.value)} />
        <Select placeholder="All academy levels" options={(levels.data || []).map(s => ({ v: s._id, l: s.name }))} value={level} onChange={e => setLevel(e.target.value)} />
        {manage && <Select placeholder="Any status" options={[{ v: 'true', l: 'Active' }, { v: 'false', l: 'Inactive' }]} value={active} onChange={e => setActive(e.target.value)} />}</div>
      {list.error ? <Loading q={list} /> : <Table rows={list.data || []} onRow={a => setView(a._id)} cols={[
        { h: 'Athlete', r: a => <div><b>{a.name}</b><br /><small className="muted">{a.athleteId}</small></div> }, { h: 'Sport / event', r: a => <div>{a.sport?.name}<br /><small className="muted">{a.eventOrPosition || ''}</small></div> }, { h: 'Level', r: a => <Badge tone="purple">{a.level?.name}</Badge> },
        { h: 'Coach', r: a => a.coach?.name || '—' }, { h: 'Overall', r: a => (a.score ? <div style={{ width: 110 }}><b>{a.score.overall}</b><Progress value={a.score.overall} /></div> : '—') },
        { h: 'Medical', r: a => <span className="sp"><Badge>{a.medicalStatus}</Badge>{a.injured && <Badge tone="red">Injured</Badge>}</span> },
        { h: 'Status', r: a => <Badge tone={a.active ? 'green' : 'gray'}>{a.active ? 'Active' : 'Inactive'}</Badge> },
        ...(manage ? [{ h: 'Actions', r: a => <div className="act" onClick={e => e.stopPropagation()}><button className="btn ghost sm" onClick={() => setForm(a)}>Edit</button><button className={`btn sm ${a.active ? 'danger' : 'green'}`} onClick={() => toggle(a)}>{a.active ? 'Deactivate' : 'Activate'}</button></div> }] : [])]} empty="No athletes match the filters" />}
    </Card>
    {view && <ProfileModal id={view} onClose={() => setView(null)} onChange={list.reload} />}
    {form && sports.data && levels.data && <AthleteForm athlete={form._id ? form : null} sports={sports.data} levels={levels.data} coaches={Array.isArray(coaches.data) ? coaches.data.filter(c => c.user || c.sport) : []} onClose={() => setForm(null)} onSaved={list.reload} />}
  </div>;
}
