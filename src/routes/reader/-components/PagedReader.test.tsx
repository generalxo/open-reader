import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import PagedReader from './PagedReader'
import type { SpineItem } from '../../../types/models/spineItem'

const spine: SpineItem[] = [
	{ id: 'ch1', href: 'OEBPS/ch1.xhtml' },
	{ id: 'ch2', href: 'OEBPS/ch2.xhtml' },
]

beforeEach(() => {
	Object.assign(window, {
		electronAPI: {
			reader: {
				getChapterBundle: vi.fn().mockResolvedValue({
					html: '<p>Chapter content</p>',
					styles: [],
				}),
			},
			native: { openExternal: vi.fn() },
		},
	})
	vi.stubGlobal('ResizeObserver', class {
		observe() {}
		unobserve() {}
		disconnect() {}
	})
})

describe('PagedReader', () => {
	it('renders without crashing', () => {
		const { container } = render(
			<PagedReader bookPath="/books/test.epub" spine={spine} />
		)
		expect(container.firstChild).toBeTruthy()
	})

	it('renders prev and next ghost buttons', () => {
		const { getAllByRole } = render(
			<PagedReader bookPath="/books/test.epub" spine={spine} />
		)
		const buttons = getAllByRole('button')
		expect(buttons).toHaveLength(2)
	})
})
