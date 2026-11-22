import { useEffect, useState } from 'react'
import { buildBookUrl } from '../../../shared/bookUrl'
import { parseNavToc, parseNcxToc, type TocEntry } from '../../../reader/toc'
import type { Book } from '../../../types/models/book'

// Any failure just means the book has no usable TOC
async function loadToc(book: Book): Promise<TocEntry[]> {
	try {
		const source = await window.electronAPI.reader.getTocSource(book.path)
		if (!source)
			return []

		const response = await fetch(buildBookUrl(book.id, source.href))
		if (!response.ok)
			return []

		const text = await response.text()

		return source.type === 'nav' ? parseNavToc(text, source.href) : parseNcxToc(text, source.href)
	} catch {
		return []
	}
}

// The book's table of contents; null while loading, [] if the book has none.
export function useToc(book: Book): TocEntry[] | null {
	const [toc, setToc] = useState<{ bookId: number; entries: TocEntry[] } | null>(null)

	useEffect(() => {
		let cancelled = false

		void loadToc(book).then((entries) => {
			if (!cancelled)
				setToc({ bookId: book.id, entries })
		})

		return () => {
			cancelled = true
		}
	}, [book])

	return toc?.bookId === book.id ? toc.entries : null
}
