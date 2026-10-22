import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Medal } from 'lucide-react';
import { useAuth } from '../auth';
import { err } from '../api';
const DEMO = [['Admin', 'admin@academy.in'], ['Coach', 'coach.athletics@academy.in'], ['Medical Officer', 'medical@academy.in'], ['Athlete', 'athlete03@academy.in'], ['Committee', 'committee@academy.in']];
export default function Login() {
  const { user, login } = useAuth(), nav = useNavigate();
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [e, setE] = useState(''), [busy, setBusy] = useState(false);
  if (user) return <Navigate to={`/${user.role}`} replace />;
  const submit = async ev => { ev.preventDefault(); setBusy(true); setE(''); try { const u = await login(email, pw); nav(`/${u.role}`); } catch (x) { setE(err(x)); } setBusy(false); };
  return <div className="login">
    <div className="login-l"><div className="logo" style={{ width: 54, height: 54 }}><Medal size={28} /></div>
      <h1>State Sports Academy<br />Athlete Development Lifecycle System</h1>
      <p>An evidence-based progression platform. Is this athlete ready for the next level based on the complete development history and supporting evidence — not just a high score?</p>
      <div className="flow"><span>Medical</span><i>→</i><span>Fitness</span><i>→</i><span>Training</span><i>→</i><span>Skill</span><i>→</i><span>Tournament</span><i>→</i><span>Scorecard</span><i>→</i><span>Committee</span></div></div>
    <div className="login-r"><form className="login-box card" onSubmit={submit}>
      <h2 style={{ marginBottom: 4 }}>Sign in</h2><p className="muted" style={{ marginTop: 0 }}>Use your academy account</p>
      {e && <div className="alert err">{e}</div>}
      <div className="field"><label>Email</label><input type="email" required value={email} onChange={x => setEmail(x.target.value)} /></div>
      <div className="field"><label>Password</label><input type="password" required value={pw} onChange={x => setPw(x.target.value)} /></div>
      <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <p className="muted" style={{ marginBottom: 0 }}>Demo accounts (password <b>Password@123</b>):</p>
      <div className="demo">{DEMO.map(([l, m]) => <button type="button" key={l} className="chip" onClick={() => { setEmail(m); setPw('Password@123'); }}>{l}</button>)}</div>
    </form></div></div>;
}
