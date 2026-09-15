import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, CATEGORY_LABEL, type AdminEvent, type DistanceCategory } from '../api';
import { Card, ErrorBox, PageHeader } from '../components/ui';

/** Converts an ISO string to the value format of <input type="datetime-local"> (local time). */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    distanceCategory: 'FIVE_K' as DistanceCategory,
    date: '',
    location: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!id) return;
    api
      .get<AdminEvent>(`/admin/events/${id}`)
      .then((e) => {
        setForm({
          name: e.name,
          description: e.description,
          distanceCategory: e.distanceCategory,
          date: toLocalInput(e.date),
          location: e.location,
        });
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = { ...form, date: new Date(form.date).toISOString() };
      const saved = editing
        ? await api.patch<AdminEvent>(`/admin/events/${id}`, body)
        : await api.post<AdminEvent>('/admin/events', body);
      navigate(`/events/${saved.id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={editing ? 'Edit event' : 'New event'}
        subtitle={editing ? undefined : 'Banner and sponsor logo can be uploaded after saving.'}
        actions={<Link className="btn btn-secondary" to={editing ? `/events/${id}` : '/events'}>Cancel</Link>}
      />
      <Card>
        <ErrorBox error={error} />
        {loaded && (
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} required maxLength={5000} />
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="distance">Distance category</label>
                <select id="distance" value={form.distanceCategory} onChange={(e) => set('distanceCategory', e.target.value as DistanceCategory)}>
                  {(Object.keys(CATEGORY_LABEL) as DistanceCategory[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
                <span className="hint">Matches the global leaderboard categories.</span>
              </div>
              <div className="field">
                <label htmlFor="date">Date &amp; time</label>
                <input id="date" type="datetime-local" value={form.date} onChange={(e) => set('date', e.target.value)} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="location">Location</label>
              <input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} required maxLength={200} placeholder="e.g. Marine Drive, Mumbai" />
            </div>
            <div className="actions">
              <button className="btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create event'}</button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
