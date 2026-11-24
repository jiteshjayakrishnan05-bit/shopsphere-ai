/** Centered card used by login and register pages. */
export function AuthCard({ title, description, children }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
