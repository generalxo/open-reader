import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithRouter } from '../utils'
import Sidebar from '../../../src/ui/components/sidebar/Sidebar'

describe('Sidebar', () => {
  it('renders all nav item labels', async () => {
    renderWithRouter(<Sidebar />)
    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(await screen.findByText('Library')).toBeInTheDocument()
  })

  it('renders a link for each nav item', async () => {
    renderWithRouter(<Sidebar />)
    const links = await screen.findAllByRole('link')
    expect(links).toHaveLength(3)
  })
})
