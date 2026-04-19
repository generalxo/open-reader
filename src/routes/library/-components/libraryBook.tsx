import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Ellipsis, ArrowBigLeft, Trash2 } from 'lucide-react'
import type { Book } from '../../../types/models/book'
import BookCard from '../../../ui/components/cards/book-card/BookCard'
import Modal from '../../../ui/components/modal/Modal'

interface LibraryBookProps {
	book: Book
	cover: string | null | undefined
	onDelete: (id: number) => void
}

export default function LibraryBook({ book, cover, onDelete }: LibraryBookProps) {
	const [flipped, setFlipped] = useState(false)
	const [deleteModalOpen, setDeleteModalOpen] = useState(false)

	function handleFlipBack() {
		setFlipped(false)
		setDeleteModalOpen(false)
	}

	async function handleConfirmDelete() {
		await window.electronAPI.books.remove(book.id)
		onDelete(book.id)
	}

	return (
		<>
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
						<BookCard className="relative flex flex-col items-center justify-center gap-3 p-4 bg-gray-700 bg-blend-multiply">
							<button
								className="absolute top-2 right-2 p-1 rounded-md bg-black/40 text-white cursor-pointer"
								onClick={handleFlipBack}
							>
								<ArrowBigLeft size={24} />
							</button>

							<button
								className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full justify-center text-lg bg-gray-800 bg-blend-multiply"
								onClick={() => setDeleteModalOpen(true)}
							>
								<Trash2 size={24} />
								Delete
							</button>
						</BookCard>
					</div>
				</motion.div>
			</div>

			<Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete book">
				<p className="text-[--color-text-muted] text-sm mb-6">
					Are you sure you want to delete {book.filename}? This cannot be undone.
				</p>
				<div className="flex gap-2 justify-end">
					<button
						className="px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors bg-gray-800"
						onClick={() => setDeleteModalOpen(false)}
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 rounded-lg text-sm text-white cursor-pointer bg-(--color-danger)"
						onClick={handleConfirmDelete}
					>
						Delete
					</button>
				</div>
			</Modal>
		</>
	)
}
