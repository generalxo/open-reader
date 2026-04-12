import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { Book } from '../../types/models/book'
import AddBook from '../../ui/components/addBook/AddBook'
import BookCard from '../../ui/components/cards/book-card/BookCard'
import LibraryNavBar from './-components/libraryNavbar'

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
				{books.map((book) => {
					const cover = coverImages.get(book.id)
					return (
						<Link key={book.id} to="/reader/$bookId" params={{ bookId: String(book.id) }}>
							<BookCard className="overflow-hidden cursor-pointer">
								{cover
									? <img src={cover} alt={book.filename} className="w-full h-full object-cover" />
									: <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs text-center p-4">{book.filename}</div>
								}
							</BookCard>
						</Link>
					)
				})}
			</div>
		</div>
	)
}
