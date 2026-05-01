import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import PagedReaderView from '../../../src/routes/reader/-components/PagedReaderView'
import type { ChapterBundle } from '../../../src/types/models/chapterBundle'

const bundle: ChapterBundle = {
	html: '<p>Hello world</p>',
	styles: ['p { color: red; }'],
}

beforeEach(() => {
	vi.stubGlobal('electronAPI', {
		native: { openExternal: vi.fn() },
	})
	vi.stubGlobal('ResizeObserver', class {
		observe() {}
		unobserve() {}
		disconnect() {}
	})
})

describe('PagedReaderView', () => {
	it('renders a host div without crashing', () => {
		const { container } = render(
			<PagedReaderView
				bundle={bundle}
				pageIndex={0}
				onPageCountReady={vi.fn()}
			/>
		)
		expect(container.firstChild).toBeTruthy()
	})
})
