import type { RunRecord, RunStatus } from './types'
import { statuses } from './types'

export const seededRuns: RunRecord[] = [
  {
    id: 'RX-1042',
    name: 'Nickel surface relaxation',
    project: 'Catalyst screening',
    owner: 'Maya Chen',
    ownerInitials: 'MC',
    method: 'VASP · PBE-D3',
    compute: 'A100 · 4 GPUs',
    status: 'Failed',
    updatedAt: '2026-08-14T13:48:00Z',
    relativeTime: '44 min ago',
    failureReason: 'Electronic convergence stalled after 180 steps.',
  },
  {
    id: 'RX-1035',
    name: 'Electrolyte diffusion sweep',
    project: 'Solid-state battery',
    owner: 'Priya Nair',
    ownerInitials: 'PN',
    method: 'LAMMPS · NequIP',
    compute: 'H100 · 2 GPUs',
    status: 'Failed',
    updatedAt: '2026-08-14T11:21:00Z',
    relativeTime: '3 hr ago',
    failureReason: 'Trajectory stopped: neighbor list overflow at 612 K.',
  },
  {
    id: 'RX-1044',
    name: 'MOF uptake validation',
    project: 'Carbon capture',
    owner: 'Jon Bell',
    ownerInitials: 'JB',
    method: 'RASPA · GCMC',
    compute: 'CPU high-memory',
    status: 'Attention',
    updatedAt: '2026-08-14T14:03:00Z',
    relativeTime: '29 min ago',
    note: 'Energy drift is above the review threshold.',
  },
  {
    id: 'RX-1038',
    name: 'Perovskite phonon check',
    project: 'Solar absorbers',
    owner: 'Leo Park',
    ownerInitials: 'LP',
    method: 'Phonopy · Quantum ESPRESSO',
    compute: 'CPU · 96 cores',
    status: 'Attention',
    updatedAt: '2026-08-14T10:55:00Z',
    relativeTime: '4 hr ago',
    note: 'Two imaginary modes need investigator review.',
  },
  {
    id: 'RX-1046',
    name: 'Protein pocket ensemble',
    project: 'Enzyme design',
    owner: 'Ari Okafor',
    ownerInitials: 'AO',
    method: 'OpenMM · AMBER',
    compute: 'A100 · 1 GPU',
    status: 'Running',
    updatedAt: '2026-08-14T14:20:00Z',
    relativeTime: '12 min ago',
    progress: 68,
    eta: 'ETA 38 min',
  },
  {
    id: 'RX-1041',
    name: 'Alloy phase-space search',
    project: 'High-entropy alloys',
    owner: 'Maya Chen',
    ownerInitials: 'MC',
    method: 'MACE · Monte Carlo',
    compute: 'A100 · 2 GPUs',
    status: 'Running',
    updatedAt: '2026-08-14T12:56:00Z',
    relativeTime: '2 hr ago',
    progress: 41,
    eta: 'ETA 1 hr 12 min',
  },
  {
    id: 'RX-1047',
    name: 'Catalyst slab convergence',
    project: 'Catalyst screening',
    owner: 'Nina Singh',
    ownerInitials: 'NS',
    method: 'VASP · SCAN',
    compute: 'CPU · 128 cores',
    status: 'Queued',
    updatedAt: '2026-08-14T14:25:00Z',
    relativeTime: 'Queued 7 min ago',
    note: 'Waiting for high-memory partition.',
  },
  {
    id: 'RX-1040',
    name: 'Membrane selectivity benchmark',
    project: 'Carbon capture',
    owner: 'Jon Bell',
    ownerInitials: 'JB',
    method: 'PyTorch · SchNet',
    compute: 'H100 · 1 GPU',
    status: 'Complete',
    updatedAt: '2026-08-14T12:14:00Z',
    relativeTime: 'Completed 2 hr ago',
    note: 'Validation MAE 0.031 eV.',
  },
  {
    id: 'RX-1037',
    name: 'Lithium vacancy migration',
    project: 'Solid-state battery',
    owner: 'Priya Nair',
    ownerInitials: 'PN',
    method: 'VASP · CI-NEB',
    compute: 'CPU · 192 cores',
    status: 'Complete',
    updatedAt: '2026-08-14T08:42:00Z',
    relativeTime: 'Completed 6 hr ago',
    note: 'Barrier converged at 0.39 eV.',
  },
  {
    id: 'RX-1032',
    name: 'Binding affinity calibration',
    project: 'Enzyme design',
    owner: 'Ari Okafor',
    ownerInitials: 'AO',
    method: 'OpenMM · MBAR',
    compute: 'A100 · 4 GPUs',
    status: 'Complete',
    updatedAt: '2026-08-13T19:10:00Z',
    relativeTime: 'Completed yesterday',
    note: 'All 24 windows passed overlap checks.',
  },
]

const statusRank = new Map<RunStatus, number>(statuses.map((status, index) => [status, index]))

export function sortRuns(runs: RunRecord[]): RunRecord[] {
  return [...runs].sort((a, b) => {
    const byStatus = (statusRank.get(a.status) ?? 0) - (statusRank.get(b.status) ?? 0)
    return byStatus || Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  })
}

export function matchesQuery(run: RunRecord, rawQuery: string): boolean {
  const query = rawQuery.trim().toLocaleLowerCase()
  if (!query) return true
  return [run.name, run.owner, run.method, run.id, run.project, run.compute]
    .join(' ')
    .toLocaleLowerCase()
    .includes(query)
}
