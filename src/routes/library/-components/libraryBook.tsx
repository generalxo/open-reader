import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Ellipsis, ArrowBigLeft } from 'lucide-react'
import type { Book } from '../../../types/models/book'
import BookCard from '../../../ui/components/cards/book-card/BookCard'

interface LibraryBookProps {
	book: Book
	cover: string | null | undefined
}

export default function LibraryBook({ book, cover }: LibraryBookProps) {
	const [flipped, setFlipped] = useState(false)

	return (
		<div className="group relative aspect-[1/1.414] w-full" style={{ perspective: '1000px' }}>
			<motion.div
				className="relative w-full h-full transform-3d"
				animate={{ rotateY: flipped ? 180 : 0 }}
				transition={{ duration: 0.3, ease: 'easeInOut' }}
			>
				<div className="absolute inset-0 backface-hidden">
					<Link to="/reader/$bookId" params={{ bookId: String(book.id) }}>
						<BookCard className="overflow-hidden cursor-pointer h-full">
							{cover
								? <img src={cover} alt={book.filename} className="w-full h-full object-cover" />
								: <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs text-center p-4">{book.filename}</div>
							}
						</BookCard>
					</Link>

					<button
						className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md group-hover:bg-black/40 text-white cursor-pointer"
						onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFlipped(true) }}
						aria-label='Options'
					>
						<Ellipsis size={24} strokeWidth={3} />
					</button>
				</div>

				<div className="absolute inset-0 backface-hidden transform-[rotateY(180deg)]">
					<BookCard className="relative bg-[--color-surface-2] flex items-center justify-center">
						<button
							className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/40 text-white cursor-pointer"
							onClick={() => setFlipped(false)}
						>
							<ArrowBigLeft size={24} />
						</button>
						<p className="text-[--color-text-muted] text-sm text-center px-4">
							More options coming soon
						</p>
					</BookCard>
				</div>
			</motion.div>
		</div>
	)
}
