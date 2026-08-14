import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

function runCards() {
  return screen.getAllByRole('article')
}

describe('Research Runboard', () => {
  it('shows the complete seeded snapshot, exact statuses, and triage ordering', () => {
    render(<App />)

    expect(screen.getByLabelText('10 total runs in this snapshot')).toBeInTheDocument()
    expect(screen.getByTestId('count-failed')).toHaveTextContent('2')
    expect(screen.getByTestId('count-attention')).toHaveTextContent('2')
    expect(screen.getByTestId('count-running')).toHaveTextContent('2')
    expect(screen.getByTestId('count-queued')).toHaveTextContent('1')
    expect(screen.getByTestId('count-complete')).toHaveTextContent('3')

    expect(runCards().map((card) => card.getAttribute('data-run-id'))).toEqual([
      'RX-1042', 'RX-1035',
      'RX-1044', 'RX-1038',
      'RX-1046', 'RX-1041',
      'RX-1047',
      'RX-1040', 'RX-1037', 'RX-1032',
    ])
  })

  it.each([
    ['run name', 'Protein pocket', 'RX-1046'],
    ['owner', 'Nina Singh', 'RX-1047'],
    ['method/model', 'NequIP', 'RX-1035'],
    ['run ID', 'RX-1037', 'RX-1037'],
  ])('searches by %s', async (_field, query, expectedId) => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('searchbox', { name: 'Search runs' }), query)
    expect(runCards()).toHaveLength(1)
    expect(runCards()[0]).toHaveAttribute('data-run-id', expectedId)
    expect(screen.getByText('1', { selector: '.visible-count strong' })).toBeInTheDocument()
  })

  it('combines status filtering with search without changing aggregate counts', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status filter' }), 'Complete')
    await user.type(screen.getByRole('searchbox', { name: 'Search runs' }), 'Ari Okafor')

    expect(runCards()).toHaveLength(1)
    expect(runCards()[0]).toHaveAttribute('data-run-id', 'RX-1032')
    expect(screen.getByTestId('count-complete')).toHaveTextContent('3')
    expect(screen.getByText('1', { selector: '.visible-count strong' })).toBeInTheDocument()
  })

  it('explains no matches and clears all filters', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status filter' }), 'Failed')
    await user.type(screen.getByRole('searchbox', { name: 'Search runs' }), 'definitely-not-a-run')
    expect(screen.getByRole('status')).toHaveTextContent('Clear your search and status filter')

    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Clear filters' }))
    expect(runCards()).toHaveLength(10)
    expect(screen.getByRole('searchbox', { name: 'Search runs' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Status filter' })).toHaveValue('All')
  })

  it('retries a failed run locally while preserving total and updating counts', async () => {
    const user = userEvent.setup()
    render(<App />)
    const failedRun = screen.getByRole('article', { name: 'Nickel surface relaxation' })

    expect(failedRun).toHaveTextContent('Electronic convergence stalled')
    await user.click(within(failedRun).getByRole('button', { name: 'Retry Nickel surface relaxation' }))

    const retriedRun = screen.getByRole('article', { name: 'Nickel surface relaxation' })
    expect(retriedRun).toHaveTextContent('Queued')
    expect(retriedRun).toHaveTextContent('Queued just now')
    expect(retriedRun).not.toHaveTextContent('Electronic convergence stalled')
    expect(runCards()).toHaveLength(10)
    expect(screen.getByTestId('count-failed')).toHaveTextContent('1')
    expect(screen.getByTestId('count-queued')).toHaveTextContent('2')
  })

  it('provides semantic status text, labelled controls, and progress values', () => {
    render(<App />)

    expect(screen.getByRole('searchbox', { name: 'Search runs' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Status filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry Nickel surface relaxation' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Protein pocket ensemble progress' })).toHaveAttribute('aria-valuenow', '68')
    expect(screen.getAllByText('Failure reason')).toHaveLength(2)
    expect(screen.getAllByText('Attention').length).toBeGreaterThan(0)
  })
})
