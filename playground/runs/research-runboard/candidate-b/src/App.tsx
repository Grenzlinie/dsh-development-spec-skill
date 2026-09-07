import { useMemo, useState } from 'react'
import { matchesQuery, seededRuns, sortRuns } from './data'
import type { RunRecord, RunStatus } from './types'
import { statuses } from './types'

type Filter = 'All' | RunStatus

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
)

const Chevron = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m8 10 4 4 4-4" />
  </svg>
)

function StatusMark({ status }: { status: RunStatus }) {
  return <span className={`status-mark status-mark--${status.toLowerCase()}`} aria-hidden="true" />
}

function MetricCard({
  status,
  count,
  active,
  onSelect,
}: {
  status: RunStatus
  count: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`metric-card metric-card--${status.toLowerCase()}${active ? ' is-active' : ''}`}
      aria-pressed={active}
      aria-label={`Show ${status} runs, ${count}`}
      onClick={onSelect}
    >
      <span className="metric-card__label">
        <StatusMark status={status} />
        {status}
      </span>
      <strong data-testid={`count-${status.toLowerCase()}`}>{count}</strong>
    </button>
  )
}

function RunCard({ run, onRetry }: { run: RunRecord; onRetry: (id: string) => void }) {
  const titleId = `run-${run.id}`
  const statusSlug = run.status.toLowerCase()

  return (
    <article className={`run-card run-card--${statusSlug}`} aria-labelledby={titleId} data-run-id={run.id}>
      <div className="run-card__head">
        <div className="run-card__identity">
          <span className="run-card__id">{run.id}</span>
          <h3 id={titleId}>{run.name}</h3>
          <p>{run.project}</p>
        </div>
        <span className={`status-pill status-pill--${statusSlug}`}>
          <StatusMark status={run.status} />
          {run.status}
        </span>
      </div>

      <dl className="run-meta">
        <div>
          <dt>Owner</dt>
          <dd className="owner-cell"><span aria-hidden="true">{run.ownerInitials}</span>{run.owner}</dd>
        </div>
        <div>
          <dt>Method / model</dt>
          <dd>{run.method}</dd>
        </div>
        <div>
          <dt>Compute</dt>
          <dd>{run.compute}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd><time dateTime={run.updatedAt}>{run.relativeTime}</time></dd>
        </div>
      </dl>

      {run.status === 'Running' && typeof run.progress === 'number' ? (
        <div className="progress-block">
          <div className="progress-block__copy">
            <span>{run.progress}% complete</span>
            <span>{run.eta}</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={`${run.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={run.progress}
          >
            <span style={{ width: `${run.progress}%` }} />
          </div>
        </div>
      ) : null}

      {run.status === 'Failed' ? (
        <div className="run-message run-message--failed">
          <div>
            <span className="run-message__eyebrow">Failure reason</span>
            <p>{run.failureReason}</p>
          </div>
          <button type="button" className="retry-button" onClick={() => onRetry(run.id)} aria-label={`Retry ${run.name}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 8a8 8 0 1 0 1 7M19 8V3m0 5h-5" />
            </svg>
            Retry
          </button>
        </div>
      ) : run.note ? (
        <p className={`run-note run-note--${statusSlug}`}>{run.note}</p>
      ) : null}
    </article>
  )
}

export default function App() {
  const [runs, setRuns] = useState<RunRecord[]>(seededRuns)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')

  const counts = useMemo(
    () => Object.fromEntries(statuses.map((status) => [status, runs.filter((run) => run.status === status).length])) as Record<RunStatus, number>,
    [runs],
  )

  const visibleRuns = useMemo(
    () => sortRuns(runs.filter((run) => (filter === 'All' || run.status === filter) && matchesQuery(run, query))),
    [filter, query, runs],
  )

  const groupedRuns = statuses
    .map((status) => ({ status, runs: visibleRuns.filter((run) => run.status === status) }))
    .filter((group) => group.runs.length > 0)

  const needsAction = counts.Failed + counts.Attention
  const hasFilters = query.trim().length > 0 || filter !== 'All'

  function clearFilters() {
    setQuery('')
    setFilter('All')
  }

  function retryRun(id: string) {
    setRuns((currentRuns) =>
      currentRuns.map((run) =>
        run.id === id
          ? {
              ...run,
              status: 'Queued',
              updatedAt: '2026-08-14T14:32:00Z',
              relativeTime: 'Queued just now',
              failureReason: undefined,
              note: 'Retry requested locally · waiting for compute.',
            }
          : run,
      ),
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="Helix Lab runboard home">
          <span className="brand__mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>HELIX</strong><small>Computational lab</small></span>
        </a>
        <div className="snapshot">
          <span className="snapshot__signal" aria-hidden="true" />
          <span><strong>Seeded snapshot</strong><small>14 Aug 2026 · 14:32 UTC</small></span>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Research operations</p>
            <h1 id="page-title">Every run, in focus.</h1>
            <p className="hero__intro">Track experiments across the lab, surface what needs attention, and keep the next result moving.</p>
          </div>
          <div className="hero__total" aria-label={`${runs.length} total runs in this snapshot`}>
            <strong>{runs.length}</strong>
            <span>Total runs</span>
          </div>
        </section>

        {needsAction > 0 ? (
          <aside className="action-callout" aria-label="Runs requiring action">
            <span className="action-callout__icon" aria-hidden="true">!</span>
            <div><strong>{needsAction} runs need a closer look</strong><p>{counts.Failed} failed · {counts.Attention} awaiting review</p></div>
            <button type="button" onClick={() => setFilter('Failed')}>View failures</button>
          </aside>
        ) : null}

        <section className="metrics" aria-label="Run counts by status">
          {statuses.map((status) => (
            <MetricCard
              key={status}
              status={status}
              count={counts[status]}
              active={filter === status}
              onSelect={() => setFilter((current) => (current === status ? 'All' : status))}
            />
          ))}
        </section>

        <section className="runboard" aria-labelledby="runboard-title">
          <div className="runboard__heading">
            <div><p className="eyebrow">Current & recent</p><h2 id="runboard-title">Runboard</h2></div>
            <p className="visible-count" aria-live="polite"><strong>{visibleRuns.length}</strong> of {runs.length} runs</p>
          </div>

          <div className="toolbar">
            <label className="search-field">
              <span className="sr-only">Search runs</span>
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, owner, method, run ID…"
              />
              {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button> : null}
            </label>
            <label className="select-field">
              <span>Status</span>
              <select aria-label="Status filter" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
                <option value="All">All statuses</option>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <Chevron />
            </label>
            {hasFilters ? <button type="button" className="clear-button" onClick={clearFilters}>Clear filters</button> : null}
          </div>

          {groupedRuns.length ? (
            <div className="run-groups">
              {groupedRuns.map((group) => (
                <section key={group.status} className="run-group" aria-labelledby={`group-${group.status.toLowerCase()}`}>
                  <div className="run-group__heading">
                    <h2 id={`group-${group.status.toLowerCase()}`}><StatusMark status={group.status} />{group.status}</h2>
                    <span>{group.runs.length} {group.runs.length === 1 ? 'run' : 'runs'}</span>
                  </div>
                  <div className="run-list">
                    {group.runs.map((run) => <RunCard key={run.id} run={run} onRetry={retryRun} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state" role="status">
              <span aria-hidden="true">⌁</span>
              <h3>No runs match this view</h3>
              <p>Clear your search and status filter to return to all {runs.length} runs.</p>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
        </section>
      </main>

      <footer><span>Local demonstration · no live cluster connection</span><span>Helix Lab / Runboard v1.0</span></footer>
    </div>
  )
}
