import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCog, Settings2, ClipboardList, Dumbbell, Stethoscope, HeartPulse, Trophy, Award, Bell, Search, LogOut, Menu, Medal, Activity, FileCheck2, GitCompare, Gavel, UserCircle, LineChart, Route, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth';
import { api } from '../api';

const NAV = {
  admin: [['/admin', 'Admin Dashboard', LayoutDashboard], ['/admin/athletes', 'Athlete Management', Users], ['/admin/users', 'Coach & User Management', UserCog], ['/admin/rules', 'Sports / Levels / Rules', Settings2]],
  coach: [['/coach', 'Coach Dashboard', LayoutDashboard], ['/coach/athletes', 'My Athletes', Users], ['/coach/training', 'Training Sessions & Attendance', Dumbbell], ['/coach/assessment', 'Skill / Performance Assessment & Evidence', ClipboardList]],
  medical: [['/medical', 'Medical Dashboard', LayoutDashboard], ['/medical/records', 'Athlete Medical Records', FileCheck2], ['/medical/examination', 'Medical Examination', Stethoscope], ['/medical/clearance', 'Medical Clearance & Injury Alerts', HeartPulse]],
  athlete: [['/athlete', 'Athlete Dashboard', LayoutDashboard], ['/athlete/journey', 'My Profile & Development Journey', Route], ['/athlete/scorecard', 'My Development Scorecard', LineChart], ['/athlete/activity', 'Training / Tournaments / Achievements', Trophy]],
  committee: [['/committee', 'Committee Dashboard', LayoutDashboard], ['/committee/candidates', 'Candidate Review & Scorecards', Award], ['/committee/compare', 'Evidence / Performance Comparison', GitCompare], ['/committee/decisions', 'Decisions & Promotion', Gavel]],
};
const SEARCH = { admin: '/admin/athletes', coach: '/coach/athletes', medical: '/medical/records', committee: '/committee/candidates' };
const TITLE = { admin: 'Administration', coach: 'Coach Console', medical: 'Medical Office', athlete: 'Athlete Portal', committee: 'Selection Committee' };

export default function Layout() {
  const { user, logout } = useAuth(), nav = useNavigate();
  const [open, setOpen] = useState(false), [pop, setPop] = useState(''), [q, setQ] = useState(''), [notes, setNotes] = useState([]);
  useEffect(() => { api.get('/notifications').then(r => setNotes(r.data)).catch(() => {}); }, [user]);
  const items = NAV[user.role];
  return <div className="app">
    <aside className={`sidebar ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
      <div className="brand"><div className="logo"><Medal size={20} /></div><div><b>State Sports Academy</b><small>Athlete Development System</small></div></div>
      <nav className="nav"><small>{TITLE[user.role]}</small>{items.map(([to, label, I], i) => <NavLink key={to} to={to} end={i === 0} className={({ isActive }) => (isActive ? 'active' : '')}><I size={18} />{label}</NavLink>)}</nav>
      <div className="side-foot"><ShieldCheck size={12} /> Evidence-based progression</div>
    </aside>
    <div className="main">
      <header className="topbar">
        <button className="icon-btn menu-btn" onClick={() => setOpen(!open)}><Menu size={18} /></button>
        {SEARCH[user.role] && <form className="search" onSubmit={e => { e.preventDefault(); nav(`${SEARCH[user.role]}?q=${encodeURIComponent(q)}`); }}><Search size={16} /><input placeholder="Search athletes…" value={q} onChange={e => setQ(e.target.value)} /></form>}
        <div className="tb-right">
          <button className="icon-btn" onClick={() => setPop(pop === 'n' ? '' : 'n')}><Bell size={18} />{notes.length > 0 && <span className="dot">{notes.length}</span>}</button>
          <button className="avatar" onClick={() => setPop(pop === 'p' ? '' : 'p')}>{user.name[0]}</button>
          {pop === 'n' && <div className="pop">{notes.length ? notes.map((n, i) => <a key={i} className="it" href={n.to} onClick={e => { e.preventDefault(); setPop(''); nav(n.to); }}>{n.text}</a>) : <div className="empty">No new notifications</div>}</div>}
          {pop === 'p' && <div className="pop"><div className="it"><b>{user.name}</b><br /><small className="muted">{user.email} · {user.role}</small></div><button className="it" onClick={() => { logout(); nav('/login'); }}><LogOut size={14} /> Sign out</button></div>}
        </div>
      </header>
      <main className="content"><Outlet /></main>
    </div>
  </div>;
}
