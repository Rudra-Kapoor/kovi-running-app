import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, CATEGORY_LABEL, fmtDate, type AdminEvent } from '../api';
import { Card, Empty, ErrorBox, PageHeader } from '../components/ui';

export function Events() {
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const navigate = useNavigate();

  useEffect(() => {
    api.get<AdminEvent[]>('/admin/events').then(setEvents).catch((e) => setError(e.message));
  }, []);

  const now = Date.now();
  const shown = (events ?? []).filter((e) => (tab === 'upcoming' ? new Date(e.date).getTime() >= now : new Date(e.date).getTime() < now));
  if (tab === 'upcoming') shown.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Organised runs that appear in the app"
        actions={<Link className="btn" to="/events/new">+ New event</Link>}
      />
      <ErrorBox error={error} />
      <Card>
        <div className="tabs">
          <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Upcoming</button>
          <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>Past</button>
        </div>
        {events && shown.length === 0 ? (
          <Empty>{tab === 'upcoming' ? 'No upcoming events. Create one to get started.' : 'No past events.'}</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th><th>Distance</th><th>Date</th><th>Location</th>
                  <th className="num">Joined</th><th className="num">Runs</th><th>Sponsor</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id} className="row-link" onClick={() => navigate(`/events/${e.id}`)}>
                    <td><strong>{e.name}</strong></td>
                    <td><span className="badge badge-primary">{CATEGORY_LABEL[e.distanceCategory]}</span></td>
                    <td>{fmtDate(e.date)}</td>
                    <td>{e.location}</td>
                    <td className="num">{e.participantCount ?? 0}</td>
                    <td className="num">{e.runCount ?? 0}</td>
                    <td>{e.sponsorLogoUrl ? <span className="badge badge-success">Logo set</span> : <span className="muted">—</span>}</td>
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
