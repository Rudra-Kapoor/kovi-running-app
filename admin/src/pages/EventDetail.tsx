import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  api,
  CATEGORY_LABEL,
  fmtDate,
  fmtDuration,
  type AdminEvent,
  type LeaderboardRow,
  type Participant,
} from '../api';
import { Avatar, Card, Empty, ErrorBox, PageHeader } from '../components/ui';

export function EventDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [tab, setTab] = useState<'leaderboard' | 'participants'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<AdminEvent>(`/admin/events/${id}`).then(setEvent).catch((e) => setError(e.message));
    api.get<LeaderboardRow[]>(`/admin/events/${id}/leaderboard`).then(setLeaderboard).catch(() => {});
    api.get<Participant[]>(`/admin/events/${id}/participants`).then(setParticipants).catch(() => {});
  }, [id]);

  useEffect(load, [load]);

  async function remove() {
    if (!event || !window.confirm(`Delete "${event.name}"? It disappears from the app; runs already recorded are kept.`)) return;
    try {
      await api.delete(`/admin/events/${id}`);
      navigate('/events', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function upload(kind: 'banner' | 'sponsor-logo', file: File) {
    setError(null);
    try {
      const updated = await api.upload<AdminEvent>(`/admin/events/${id}/${kind}`, file);
      setEvent((e) => (e ? { ...e, ...updated } : updated));
      setNotice(kind === 'banner' ? 'Banner updated.' : 'Sponsor logo updated.');
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeLogo() {
    if (!window.confirm('Remove the sponsor logo? Story cards for this event will no longer show it.')) return;
    try {
      const updated = await api.delete<AdminEvent>(`/admin/events/${id}/sponsor-logo`);
      setEvent((e) => (e ? { ...e, ...updated } : updated));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!event) return <ErrorBox error={error} />;
  const isPast = new Date(event.date).getTime() < Date.now();

  return (
    <>
      <PageHeader
        title={event.name}
        subtitle={`${CATEGORY_LABEL[event.distanceCategory]} · ${fmtDate(event.date)} · ${event.location}`}
        actions={
          <>
            <Link className="btn btn-secondary" to="/events">All events</Link>
            <Link className="btn btn-secondary" to={`/events/${id}/edit`}>Edit</Link>
            <button className="btn btn-danger" onClick={remove}>Delete</button>
          </>
        }
      />
      <ErrorBox error={error} />
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card stat"><div className="label">Status</div><div className="value" style={{ fontSize: 20 }}>{isPast ? 'Past' : 'Upcoming'}</div></div>
        <div className="card stat"><div className="label">Joined</div><div className="value">{event.participantCount ?? 0}</div></div>
        <div className="card stat"><div className="label">Runs recorded</div><div className="value">{event.runCount ?? 0}</div></div>
        <div className="card stat"><div className="label">Finishers</div><div className="value">{leaderboard?.length ?? 0}</div></div>
      </div>

      <div className="grid grid-2">
        <Card>
          <h2>Description</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>
        </Card>
        <Card>
          <h2>Images</h2>
          <div className="grid grid-2">
            <ImageSlot
              label="Banner"
              hint="Shown on the event card and details screen."
              url={event.bannerUrl}
              className="banner"
              onFile={(f) => upload('banner', f)}
            />
            <ImageSlot
              label="Sponsor logo"
              hint="Appears only on the post-run story card for this event."
              url={event.sponsorLogoUrl}
              className="logo"
              onFile={(f) => upload('sponsor-logo', f)}
              onRemove={event.sponsorLogoUrl ? removeLogo : undefined}
            />
          </div>
        </Card>
      </div>

      <Card>
        <div className="tabs">
          <button className={tab === 'leaderboard' ? 'active' : ''} onClick={() => setTab('leaderboard')}>Leaderboard</button>
          <button className={tab === 'participants' ? 'active' : ''} onClick={() => setTab('participants')}>Participants</button>
        </div>
        {tab === 'leaderboard' &&
          (leaderboard && leaderboard.length === 0 ? (
            <Empty>No finishers yet. Runners appear here once they complete the {CATEGORY_LABEL[event.distanceCategory]} distance in Event Run Mode.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Rank</th><th>Runner</th><th>Club</th><th>City</th><th className="num">Time</th></tr></thead>
                <tbody>
                  {(leaderboard ?? []).map((r) => (
                    <tr key={r.userId}>
                      <td><span className={`rank rank-${r.rank}`}>{r.rank}</span></td>
                      <td><div className="cell-user"><Avatar url={r.photoUrl} name={r.name} />{r.name}</div></td>
                      <td>{r.club ?? <span className="muted">—</span>}</td>
                      <td>{r.city ?? <span className="muted">—</span>}</td>
                      <td className="num"><strong>{fmtDuration(r.completionSeconds)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        {tab === 'participants' &&
          (participants && participants.length === 0 ? (
            <Empty>Nobody has joined yet.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Runner</th><th>Club</th><th>City</th><th>Joined</th></tr></thead>
                <tbody>
                  {(participants ?? []).map((p) => (
                    <tr key={p.userId}>
                      <td><div className="cell-user"><Avatar url={p.photoUrl} name={p.name} />{p.name}</div></td>
                      <td>{p.club ?? <span className="muted">—</span>}</td>
                      <td>{p.city ?? <span className="muted">—</span>}</td>
                      <td className="muted">{fmtDate(p.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </Card>
    </>
  );
}

function ImageSlot({
  label,
  hint,
  url,
  className,
  onFile,
  onRemove,
}: {
  label: string;
  hint: string;
  url: string | null;
  className: 'banner' | 'logo';
  onFile: (f: File) => void;
  onRemove?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="image-slot">
      <div>
        <strong>{label}</strong>
        <div className="muted small">{hint}</div>
      </div>
      {url ? (
        <img className={`image-preview ${className}`} src={url} alt={label} />
      ) : (
        <div className={`image-preview image-empty ${className}`}>No {label.toLowerCase()}</div>
      )}
      <div className="actions">
        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Uploading…' : url ? 'Replace' : 'Upload'}
        </button>
        {onRemove && <button className="btn btn-danger btn-sm" onClick={onRemove}>Remove</button>}
      </div>
      <input
        ref={input}
        className="file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          try {
            await onFile(f);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
