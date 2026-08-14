export type RunStatus = 'Running' | 'Failed' | 'Attention' | 'Completed' | 'Queued'

export type Run = {
  id: string
  name: string
  project: string
  owner: string
  initials: string
  status: RunStatus
  model: string
  started: string
  timeLabel: string
  duration: string
  progress?: number
  gpu: string
  note: string
  color: string
}

export const runs: Run[] = [
  {
    id: 'RUN-1842',
    name: 'Protein folding — batch 12',
    project: 'Helix / AlphaFold',
    owner: 'Maya Chen',
    initials: 'MC',
    status: 'Running',
    model: 'af2-multimer-v3',
    started: 'Today, 09:42',
    timeLabel: '18 min ago',
    duration: '00:18:24',
    progress: 67,
    gpu: '4 × A100',
    note: 'Processing target 84 of 126. Predicted finish in 11 minutes.',
    color: '#2d7665',
  },
  {
    id: 'RUN-1841',
    name: 'Ligand docking screen',
    project: 'Catalyst / Docking',
    owner: 'Jon Bell',
    initials: 'JB',
    status: 'Failed',
    model: 'vina-gpu-2.1',
    started: 'Today, 09:17',
    timeLabel: '43 min ago',
    duration: '00:07:12',
    gpu: '2 × A100',
    note: 'CUDA out of memory on worker gpu-07. Last checkpoint is available.',
    color: '#98702d',
  },
  {
    id: 'RUN-1839',
    name: 'Cryo-EM particle picking',
    project: 'Atlas / Cryo-EM',
    owner: 'Priya Nair',
    initials: 'PN',
    status: 'Completed',
    model: 'topaz-0.2.5',
    started: 'Today, 07:31',
    timeLabel: '2 hr ago',
    duration: '01:24:38',
    gpu: '1 × V100',
    note: '82,641 particles selected across 214 micrographs.',
    color: '#5568a3',
  },
  {
    id: 'RUN-1838',
    name: 'MD equilibration — replica C',
    project: 'Membrane / Simulation',
    owner: 'Elena Rossi',
    initials: 'ER',
    status: 'Running',
    model: 'gromacs-2024.1',
    started: 'Today, 06:08',
    timeLabel: '4 hr ago',
    duration: '04:02:11',
    progress: 42,
    gpu: '2 × A100',
    note: 'Temperature stable at 310 K. 84 ns of 200 ns completed.',
    color: '#875b78',
  },
  {
    id: 'RUN-1835',
    name: 'Variant effect benchmark',
    project: 'Helix / Evaluation',
    owner: 'Maya Chen',
    initials: 'MC',
    status: 'Completed',
    model: 'esm-2-650m',
    started: 'Yesterday, 22:14',
    timeLabel: '12 hr ago',
    duration: '03:46:09',
    gpu: '4 × A100',
    note: 'Evaluation complete. AUROC 0.918 on the held-out variant set.',
    color: '#2d7665',
  },
  {
    id: 'RUN-1832',
    name: 'Diffusion ensemble — seed 08',
    project: 'Catalyst / Generation',
    owner: 'Sam Okafor',
    initials: 'SO',
    status: 'Queued',
    model: 'mol-diffusion-r6',
    started: 'Yesterday, 18:46',
    timeLabel: '15 hr ago',
    duration: '—',
    gpu: '8 × A100',
    note: 'Waiting for an 8-GPU node. Queue position: 2.',
    color: '#4a7180',
  },
  {
    id: 'RUN-1829',
    name: 'Segmentation fine-tune',
    project: 'Atlas / Imaging',
    owner: 'Priya Nair',
    initials: 'PN',
    status: 'Attention',
    model: 'unet-3d-r18',
    started: 'Yesterday, 15:02',
    timeLabel: '19 hr ago',
    duration: '02:13:45',
    gpu: '2 × V100',
    note: 'Input shard 19 failed checksum validation. Replace the shard before resuming.',
    color: '#5568a3',
  },
  {
    id: 'RUN-1826',
    name: 'Conformer search — set B',
    project: 'Catalyst / Quantum',
    owner: 'Jon Bell',
    initials: 'JB',
    status: 'Completed',
    model: 'xtb-6.7.1',
    started: 'Yesterday, 11:23',
    timeLabel: '23 hr ago',
    duration: '05:51:03',
    gpu: 'CPU cluster',
    note: '1,204 low-energy conformers exported for downstream docking.',
    color: '#98702d',
  },
]
