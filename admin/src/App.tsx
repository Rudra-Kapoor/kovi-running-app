import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { EventDetail } from './pages/EventDetail';
import { EventForm } from './pages/EventForm';
import { Events } from './pages/Events';
import { Login } from './pages/Login';
import { Users } from './pages/Users';

export default function App() {
  const { admin, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!admin) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/new" element={<EventForm />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/events/:id/edit" element={<EventForm />} />
        <Route path="/users" element={<Users />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
