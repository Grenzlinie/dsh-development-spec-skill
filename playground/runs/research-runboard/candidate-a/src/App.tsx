import { useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock3,
  Cpu,
  FlaskConical,
  Menu,
  Search,
  SlidersHorizontal,
  RotateCcw,
  X,
  Zap,
} from 'lucide-react'
import { Run, RunStatus, runs as seededRuns } from './data'

type Filter = 'All' | RunStatus
const filters: Filter[] = ['All', 'Failed', 'Attention', 'Running', 'Queued', 'Completed']

const statusIcon = {
  Running: Activity,
  Failed: AlertCircle,
  Attention: AlertTriangle,
  Completed: CheckCircle2,
  Queued: CircleDashed,
}

const statusPriority: Record<RunStatus, number> = {
  Failed: 0,
  Attention: 1,
  Running: 2,
  Queued: 3,
  Completed: 4,
}

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Northstar Research home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        <strong>Northstar</strong>
        <small>Research Computing</small>
      </span>
    </a>
  )
}

function RunRow({ run, onOpen, onRetry }: { run: Run; onOpen: (run: Run) => void; onRetry: (run: Run) => void }) {
  const Icon = statusIcon[run.status]
  const needsAction = run.status === 'Failed' || run.status === 'Attention'
  return (
    <article className={`run-row${needsAction ? ' action-row' : ''}`}>
      <span className="run-primary">
        <button className="run-name" onClick={() => onOpen(run)} aria-label={`View ${run.name}`}>{run.name}</button>
        <span className="run-meta-mobile">{run.project} · {run.id}</span>
        {needsAction && <span className="run-issue">{run.note}</span>}
      </span>
      <span className={`status status-${run.status.toLowerCase()}`}>
        <Icon size={14} strokeWidth={2.4} />
        {run.status}
      </span>
      <span className="project-cell">
        <strong>{run.project.split(' / ')[0]}</strong>
        <small>{run.project.split(' / ')[1]}</small>
      </span>
      <span className="owner-cell">
        <span className="avatar" style={{ backgroundColor: run.color }}>{run.initials}</span>
        <span>{run.owner}</span>
      </span>
      <span className="resource-cell">
        <strong>{run.model}</strong>
        <small>{run.gpu}</small>
      </span>
      <span className="time-cell">
        <strong>{run.timeLabel}</strong>
        <small>{run.duration}</small>
      </span>
      <span className="row-actions">
        {needsAction && <button className="retry-button" onClick={() => onRetry(run)} aria-label={`Retry ${run.name}`}><RotateCcw size={13} /> Retry</button>}
        <button className="row-detail" onClick={() => onOpen(run)} aria-label={`Open details for ${run.name}`}><ChevronRight size={18} /></button>
      </span>
    </article>
  )
}

function RunDetails({ run, onClose }: { run: Run; onClose: () => void }) {
  const Icon = statusIcon[run.status]
  return (
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-top">
          <span className={`status status-${run.status.toLowerCase()}`}><Icon size={14} />{run.status}</span>
          <button className="icon-button" onClick={onClose} aria-label="Close details"><X size={20} /></button>
        </div>
        <p className="eyebrow">{run.id} · {run.project}</p>
        <h2 id="drawer-title">{run.name}</h2>
        <p className="drawer-note">{run.note}</p>
        {typeof run.progress === 'number' && (
          <div className="progress-block">
            <div><span>Progress</span><strong>{run.progress}%</strong></div>
            <span className="progress-track"><i style={{ width: `${run.progress}%` }} /></span>
          </div>
        )}
        <dl className="details-grid">
          <div><dt>Owner</dt><dd><span className="avatar" style={{ backgroundColor: run.color }}>{run.initials}</span>{run.owner}</dd></div>
          <div><dt>Environment</dt><dd>{run.model}</dd></div>
          <div><dt>Resources</dt><dd>{run.gpu}</dd></div>
          <div><dt>Started</dt><dd>{run.started}</dd></div>
          <div><dt>Elapsed</dt><dd>{run.duration}</dd></div>
        </dl>
        <div className="activity-card">
          <div className="activity-head"><span>Latest activity</span><small>live</small></div>
          <code>$ worker --resume {run.id.toLowerCase()}</code>
          <p>{run.status === 'Failed' ? 'Process exited with code 137' : run.status === 'Queued' ? 'Awaiting scheduler allocation' : 'Checkpoint written successfully'}</p>
        </div>
      </aside>
    </div>
  )
}

export default function App() {
  const [runs, setRuns] = useState<Run[]>(() => seededRuns)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [selected, setSelected] = useState<Run | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const counts = useMemo(() => ({
    Running: runs.filter((run) => run.status === 'Running').length,
    Failed: runs.filter((run) => run.status === 'Failed').length,
    Attention: runs.filter((run) => run.status === 'Attention').length,
    Completed: runs.filter((run) => run.status === 'Completed').length,
    Queued: runs.filter((run) => run.status === 'Queued').length,
  }), [runs])

  const filteredRuns = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return runs.filter((run) => {
      const matchesFilter = filter === 'All' || run.status === filter
      const matchesSearch = !normalized || [run.name, run.id, run.project, run.owner, run.model]
        .some((value) => value.toLowerCase().includes(normalized))
      return matchesFilter && matchesSearch
    }).sort((a, b) => statusPriority[a.status] - statusPriority[b.status])
  }, [filter, query, runs])

  const retryRun = (target: Run) => {
    setRuns((current) => current.map((run) => run.id === target.id ? {
      ...run,
      status: 'Queued',
      started: 'Retry queued just now',
      timeLabel: 'just now',
      duration: '—',
      progress: undefined,
      note: 'Retry requested. Waiting for scheduler allocation.',
    } : run))
  }

  return (
    <div className="app-shell" id="top">
      <header className="topbar">
        <Brand />
        <nav className={menuOpen ? 'main-nav nav-open' : 'main-nav'} aria-label="Primary navigation">
          <a className="active" href="#runs" onClick={() => setMenuOpen(false)}>Runs</a>
          <a href="#projects" onClick={() => setMenuOpen(false)}>Projects</a>
          <a href="#cluster" onClick={() => setMenuOpen(false)}>Cluster</a>
        </nav>
        <div className="header-actions">
          <span className="cluster-state"><i /> Cluster healthy</span>
          <button className="avatar header-avatar" aria-label="Account for Maya Chen">MC</button>
          <button className="menu-button" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Menu size={21} /></button>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow"><span /> Live workspace</p>
            <h1 id="page-title">Research runs</h1>
            <p>Monitor experiments across your lab, from queue to completion.</p>
          </div>
          <button className="new-run"><Zap size={17} fill="currentColor" /> New run</button>
        </section>

        <section className="summary-grid" aria-label="Run summary">
          <button className={filter === 'Running' ? 'summary-card selected' : 'summary-card'} onClick={() => setFilter('Running')}>
            <span className="summary-icon running"><Activity size={19} /></span>
            <span><strong>{counts.Running}</strong><small>Running now</small></span>
            <span className="spark-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          </button>
          <button className={filter === 'Failed' ? 'summary-card selected' : 'summary-card'} onClick={() => setFilter('Failed')}>
            <span className="summary-icon failed"><AlertCircle size={19} /></span>
            <span><strong>{counts.Failed}</strong><small>Failed</small></span>
            <span className="attention-dot">Retry</span>
          </button>
          <button className={filter === 'Attention' ? 'summary-card selected' : 'summary-card'} onClick={() => setFilter('Attention')}>
            <span className="summary-icon attention"><AlertTriangle size={19} /></span>
            <span><strong>{counts.Attention}</strong><small>Needs attention</small></span>
            <span className="attention-dot amber">Review</span>
          </button>
          <button className={filter === 'Completed' ? 'summary-card selected' : 'summary-card'} onClick={() => setFilter('Completed')}>
            <span className="summary-icon complete"><Check size={19} /></span>
            <span><strong>{counts.Completed}</strong><small>Completed · 24h</small></span>
          </button>
          <button className={filter === 'Queued' ? 'summary-card selected' : 'summary-card'} onClick={() => setFilter('Queued')}>
            <span className="summary-icon queued"><Clock3 size={19} /></span>
            <span><strong>{counts.Queued}</strong><small>Waiting in queue</small></span>
          </button>
        </section>

        <section className="runboard" id="runs" aria-labelledby="runboard-title">
          <div className="runboard-header">
            <div>
              <h2 id="runboard-title">All runs</h2>
              <p>{filteredRuns.length} of {runs.length} runs shown</p>
            </div>
            <div className="controls">
              <label className="search-box">
                <Search size={17} aria-hidden="true" />
                <span className="sr-only">Search runs</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search runs, projects, people…" />
                {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}
              </label>
              <button className="sort-button"><SlidersHorizontal size={16} /> Latest <ChevronDown size={15} /></button>
            </div>
          </div>
          <div className="filter-row" role="group" aria-label="Filter runs by status">
            {filters.map((item) => (
              <button key={item} className={filter === item ? 'filter-chip active' : 'filter-chip'} onClick={() => setFilter(item)}>
                {item}{item !== 'All' && <span>{counts[item]}</span>}
              </button>
            ))}
          </div>
          <div className="run-table">
            <div className="table-head" aria-hidden="true">
              <span>Run</span><span>Status</span><span>Project</span><span>Owner</span><span>Environment</span><span>Started / duration</span><span>Action</span>
            </div>
            <div className="table-body">
              {filteredRuns.map((run) => <RunRow key={run.id} run={run} onOpen={setSelected} onRetry={retryRun} />)}
              {filteredRuns.length === 0 && (
                <div className="empty-state">
                  <FlaskConical size={27} />
                  <h3>No matching runs</h3>
                  <p>Try a different search or status filter.</p>
                  <button onClick={() => { setQuery(''); setFilter('All') }}>Clear filters</button>
                </div>
              )}
            </div>
          </div>
          <footer className="runboard-footer"><span><Cpu size={15} /> Compute usage refreshed just now</span><span>Auto-refreshes every 30 seconds</span></footer>
        </section>
      </main>
      {selected && <RunDetails run={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
