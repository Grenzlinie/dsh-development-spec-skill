export const statuses = ['Failed', 'Attention', 'Running', 'Queued', 'Complete'] as const

export type RunStatus = (typeof statuses)[number]

export interface RunRecord {
  id: string
  name: string
  project: string
  owner: string
  ownerInitials: string
  method: string
  compute: string
  status: RunStatus
  updatedAt: string
  relativeTime: string
  progress?: number
  eta?: string
  failureReason?: string
  note?: string
}
