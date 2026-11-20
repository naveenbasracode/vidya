import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loading } from '@carbon/react';
import { useAuth } from './context/auth.jsx';
import AppShell from './components/AppShell.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Today from './pages/Today.jsx';
import Schedule from './pages/Schedule.jsx';
import Practice from './pages/Practice.jsx';
import PracticeSet from './pages/PracticeSet.jsx';
import Exams from './pages/Exams.jsx';
import ExamTake from './pages/ExamTake.jsx';
import ExamResult from './pages/ExamResult.jsx';
import Progress from './pages/Progress.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Alerts from './pages/Alerts.jsx';
import Family from './pages/Family.jsx';
import AdminDocuments from './pages/admin/AdminDocuments.jsx';
import AdminExams from './pages/admin/AdminExams.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading description="Loading Vidya" withOverlay={false} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** Student pages need a student: the logged-in student, or a parent's selected child. */
function RequireStudent({ children }) {
  const { user, studentId } = useAuth();
  if (user.role === 'STUDENT' && !user.onboarded) return <Navigate to="/setup" replace />;
  if (!studentId) return <Navigate to={user.role === 'ADMIN' ? '/admin/documents' : '/family'} replace />;
  return children;
}

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell>
              <Routes>
                <Route path="/" element={<RequireStudent><Today /></RequireStudent>} />
                <Route path="/schedule" element={<RequireStudent><Schedule /></RequireStudent>} />
                <Route path="/practice" element={<RequireStudent><Practice /></RequireStudent>} />
                <Route path="/practice/:setId" element={<RequireStudent><PracticeSet /></RequireStudent>} />
                <Route path="/exams" element={<RequireStudent><Exams /></RequireStudent>} />
                <Route path="/exams/take/:examId" element={<RequireRole roles={['STUDENT']}><ExamTake /></RequireRole>} />
                <Route path="/exams/result/:attemptId" element={<RequireStudent><ExamResult /></RequireStudent>} />
                <Route path="/progress" element={<RequireStudent><Progress /></RequireStudent>} />
                <Route path="/roadmap" element={<RequireStudent><Roadmap /></RequireStudent>} />
                <Route path="/alerts" element={<RequireStudent><Alerts /></RequireStudent>} />
                <Route path="/setup" element={<Onboarding />} />
                <Route path="/family" element={<RequireRole roles={['PARENT', 'ADMIN']}><Family /></RequireRole>} />
                <Route path="/admin/documents" element={<RequireRole roles={['ADMIN']}><AdminDocuments /></RequireRole>} />
                <Route path="/admin/exams" element={<RequireRole roles={['ADMIN']}><AdminExams /></RequireRole>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
