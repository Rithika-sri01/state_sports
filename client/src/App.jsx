import { Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import Login from './components/Login';
import * as Admin from './pages/admin';
import * as Coach from './pages/coach';
import * as Medical from './pages/medical';
import * as Athlete from './pages/athlete';
import * as Committee from './pages/committee';

const ROUTES = {
  admin: [['', Admin.Dashboard], ['athletes', Admin.Athletes], ['users', Admin.Users], ['rules', Admin.Rules]],
  coach: [['', Coach.Dashboard], ['athletes', Coach.MyAthletes], ['training', Coach.Training], ['assessment', Coach.Assessment]],
  medical: [['', Medical.Dashboard], ['records', Medical.Records], ['examination', Medical.Examination], ['clearance', Medical.Clearance]],
  athlete: [['', Athlete.Dashboard], ['journey', Athlete.Journey], ['scorecard', Athlete.Scorecard], ['activity', Athlete.Activity]],
  committee: [['', Committee.Dashboard], ['candidates', Committee.Candidates], ['compare', Committee.Compare], ['decisions', Committee.Decisions]],
};
function Guard({ role }) { const { user } = useAuth(); if (!user) return <Navigate to="/login" replace />; return user.role === role ? <Outlet /> : <Navigate to={`/${user.role}`} replace />; }
function Shell() { const { user } = useAuth(); return user ? <Layout /> : <Navigate to="/login" replace />; }
export default function App() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<Shell />}>{Object.entries(ROUTES).map(([role, pages]) => <Route key={role} path={`/${role}`} element={<Guard role={role} />}>{pages.map(([p, C]) => (p === '' ? <Route index key="i" element={<C />} /> : <Route key={p} path={p} element={<C />} />))}</Route>)}</Route>
    <Route path="*" element={<Navigate to={user ? `/${user.role}` : '/login'} replace />} />
  </Routes>;
}
