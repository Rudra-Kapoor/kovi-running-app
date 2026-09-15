import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate, fmtDuration, fmtKm, type Stats } from '../api';
import { Card, Empty, ErrorBox, PageHeader } from '../components/ui';

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Stats>('/admin/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="What's happening across the app" />
      <ErrorBox error={error} />
      {stats && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 20 }}>
            <Stat label="Runners" value={stats.users} />
            <Stat label="Runs recorded" value={stats.runs} />
            <Stat label="Events" value={stats.events} hint={`${stats.upcomingEvents} upcoming`} />
            <Stat label="Event joins" value={stats.participations} />
          </div>
          <div className="grid grid-2">
            <Card>
              <h2>Recent sign-ups</h2>
              {stats.recentUsers.length === 0 ? (
                <Empty>No runners yet.</Empty>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>City</th><th>Joined</th></tr></thead>
                    <tbody>
                      {stats.recentUsers.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}<div className="muted small">{u.email}</div></td>
                          <td>{u.city ?? '—'}</td>
                          <td className="muted">{fmtDate(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card>
              <h2>Recent runs</h2>
              {stats.recentRuns.length === 0 ? (
                <Empty>No runs yet.</Empty>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Runner</th><th>Event</th><th className="num">Distance</th><th className="num">Time</th></tr></thead>
                    <tbody>
                      {stats.recentRuns.map((r) => (
                        <tr key={r.id}>
                          <td>{r.user.name}<div className="muted small">{fmtDate(r.startedAt)}</div></td>
                          <td>{r.event ? <Link to={`/events/${r.event.id}`}>{r.event.name}</Link> : <span className="muted">Free run</span>}</td>
                          <td className="num">{fmtKm(r.distanceMeters)}</td>
                          <td className="num">{fmtDuration(r.durationSeconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value">{value.toLocaleString()}</div>
      {hint && <div className="muted small">{hint}</div>}
    </div>
  );
}
