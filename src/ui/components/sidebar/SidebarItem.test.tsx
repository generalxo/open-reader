import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { BookIcon } from 'lucide-react'
import { renderWithRouter } from '../../../test/utils'
import SidebarItem from './SidebarItem'

describe('SidebarItem', () => {
  const item = { label: 'Library', to: '/library', icon: BookIcon }

  it('renders the label text', async () => {
    renderWithRouter(<SidebarItem item={item} />)
    expect(await screen.findByText('Library')).toBeInTheDocument()
  })

  it('renders a link to the correct path', async () => {
    renderWithRouter(<SidebarItem item={item} />)
    expect(await screen.findByRole('link')).toHaveAttribute('href', '/library')
  })
})
