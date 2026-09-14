import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function ErrorBox({ error }: { error: string | null }) {
  return error ? <div className="alert alert-error">{error}</div> : null;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty muted">{children}</div>;
}

export function Avatar({ url, name, size = 28 }: { url: string | null; name: string; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  return url ? (
    <img className="avatar" src={url} alt="" style={style} />
  ) : (
    <span className="avatar avatar-fallback" style={style}>{name.charAt(0).toUpperCase()}</span>
  );
}
