import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import ReaderContainer from './-components/ReaderContainer'
import type { Book } from '../../types/models/book'

export const Route = createFileRoute('/reader/$bookId')({
	component: RouteComponent,
})

function RouteComponent() {
	const { bookId } = Route.useParams()
	// undefined while loading, null if the book isn't in the library (or couldn't be read)
	const [book, setBook] = useState<Book | null | undefined>(undefined)

	useEffect(() => {
		window.electronAPI.books.get(Number(bookId)).then(setBook).catch(() => setBook(null))
	}, [bookId])

	if (book === undefined)
		return null

	if (!book)
		return <p className="p-6 text-sm text-[var(--color-text-muted)]">This book could not be found.</p>

	return <ReaderContainer book={book} />
}
