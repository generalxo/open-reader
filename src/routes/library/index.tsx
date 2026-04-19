import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Book } from '../../types/models/book'
import AddBook from './-components/AddBook'
import LibraryNavBar from './-components/LibraryNavbar'
import LibraryBook from './-components/LibraryBook'

export const Route = createFileRoute('/library/')({
	component: RouteComponent,
})

function RouteComponent() {
	const [books, setBooks] = useState<Book[]>([])
	const [coverImages, setCoverImages] = useState<Map<number, string | null>>(new Map())

	useEffect(() => {
		window.electronAPI.books.list().then((bookList) => {
			setBooks(bookList)

			Promise.all(
				bookList.map(async (book) => {
					if (!book.coverImagePath)
						return [book.id, null] as const
					const dataUrl = await window.electronAPI.zip.getBookCoverImage(book.path, book.coverImagePath)
					return [book.id, dataUrl] as const
				})
			).then((entries) => setCoverImages(new Map(entries)))
		})
	}, [])

	async function handleBookAdded(book: Book) {
		setBooks((prev) => [book, ...prev])

		const cover = book.coverImagePath
			? await window.electronAPI.zip.getBookCoverImage(book.path, book.coverImagePath)
			: null

		setCoverImages((prev) => new Map(prev).set(book.id, cover))
	}

	return (
		<div className='flex flex-col w-full'>
			<LibraryNavBar />
			<div className='grid grid-cols-6 gap-5 w-auto'>
				<AddBook onBookAdded={handleBookAdded} />
				{books.map((book) => (
					<LibraryBook key={book.id} book={book} cover={coverImages.get(book.id)} />
				))}
			</div>
		</div>
	)
}
