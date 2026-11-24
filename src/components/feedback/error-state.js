import { AlertTriangle } from "lucide-react";

/** Human-readable error with a recovery action. */
export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div role="alert" className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-danger" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      {message && <p className="mt-1 text-sm text-ink-soft">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
