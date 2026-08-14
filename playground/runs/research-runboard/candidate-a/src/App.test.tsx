import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Research runboard', () => {
  it('renders the overview and seeded runs', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Research runs' })).toBeInTheDocument()
    expect(screen.getByText('Protein folding — batch 12')).toBeInTheDocument()
    expect(screen.getByText('Ligand docking screen')).toBeInTheDocument()
    expect(screen.getByText('8 of 8 runs shown')).toBeInTheDocument()
  })

  it('filters by status and clears the filter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Failed 1$/ }))
    expect(screen.getByText('1 of 8 runs shown')).toBeInTheDocument()
    expect(screen.getByText('Ligand docking screen')).toBeInTheDocument()
    expect(screen.queryByText('Protein folding — batch 12')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('8 of 8 runs shown')).toBeInTheDocument()
  })

  it('puts failed and attention work ahead of lower-priority runs', () => {
    render(<App />)
    const orderedRuns = screen.getAllByRole('button', { name: /^View / })
    expect(orderedRuns[0]).toHaveAccessibleName('View Ligand docking screen')
    expect(orderedRuns[1]).toHaveAccessibleName('View Segmentation fine-tune')
    expect(screen.getByText(/Replace the shard before resuming/)).toBeVisible()
  })

  it('searches across people and project metadata', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByPlaceholderText('Search runs, projects, people…'), 'Priya')
    expect(screen.getByText('2 of 8 runs shown')).toBeInTheDocument()
    expect(screen.getByText('Cryo-EM particle picking')).toBeInTheDocument()
    expect(screen.getByText('Segmentation fine-tune')).toBeInTheDocument()
  })

  it('combines status filtering with metadata search', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Completed 3$/ }))
    await user.type(screen.getByPlaceholderText('Search runs, projects, people…'), 'Maya')
    expect(screen.getByText('1 of 8 runs shown')).toBeInTheDocument()
    expect(screen.getByText('Variant effect benchmark')).toBeInTheDocument()
    expect(screen.queryByText('Protein folding — batch 12')).not.toBeInTheDocument()
  })

  it('queues a failed run for retry and updates its local state', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Retry Ligand docking screen' }))
    const runButton = screen.getByRole('button', { name: 'View Ligand docking screen' })
    const row = runButton.closest('article')
    expect(row).not.toBeNull()
    expect(within(row!).getByText('Queued')).toBeInTheDocument()
    expect(within(row!).queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument()
    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  it('opens and closes run details', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'View Ligand docking screen' }))
    const dialog = screen.getByRole('dialog', { name: 'Ligand docking screen' })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/CUDA out of memory/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close details' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a recoverable empty state', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByPlaceholderText('Search runs, projects, people…'), 'no-such-run')
    expect(screen.getByRole('heading', { name: 'No matching runs' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('8 of 8 runs shown')).toBeInTheDocument()
  })
})
