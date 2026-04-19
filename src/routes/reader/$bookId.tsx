import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import ReaderContainer from './-components/ReaderContainer'
import type { Book } from '../../types/models/book'

export const Route = createFileRoute('/reader/$bookId')({
	component: RouteComponent,
})

function RouteComponent() {
	const { bookId } = Route.useParams()
	const [book, setBook] = useState<Book | null>(null)

	useEffect(() => {
		window.electronAPI.books.get(Number(bookId)).then(setBook).catch(console.error)
	}, [bookId])

	if (!book)
		return null

	return <ReaderContainer bookPath={book.path} />
}
