import { useEffect, useState } from 'react';
import { api, fmtDate, type AdminUserRow } from '../api';
import { Avatar, Card, Empty, ErrorBox, PageHeader } from '../components/ui';

export function Users() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = setTimeout(() => {
      api.get<AdminUserRow[]>(`/admin/users?search=${encodeURIComponent(search)}&take=100`)
        .then(setUsers)
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(h);
  }, [search]);

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Runners signed up in the app"
        actions={<input placeholder="Search name, email, city, club…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} />}
      />
      <ErrorBox error={error} />
      <Card>
        {users && users.length === 0 ? (
          <Empty>No users found.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Runner</th><th>Location</th><th>Club</th><th>Sign-in</th><th className="num">Runs</th><th className="num">Events</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => (
                  <tr key={u.id}>
                    <td><div className="cell-user"><Avatar url={u.photoUrl} name={u.name} /><div>{u.name}<div className="muted small">{u.email}</div></div></div></td>
                    <td>{[u.city, u.state, u.country].filter(Boolean).join(', ') || <span className="muted">—</span>}</td>
                    <td>{u.club ?? <span className="muted">—</span>}</td>
                    <td><span className="badge">{u.provider.toLowerCase()}</span></td>
                    <td className="num">{u.runCount}</td>
                    <td className="num">{u.eventCount}</td>
                    <td className="muted">{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
