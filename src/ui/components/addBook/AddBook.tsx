import { CirclePlus } from "lucide-react";
import { motion, useAnimationControls } from "motion/react";
import type { Book } from "../../../types/models/book";
import BookCard from "../cards/book-card/BookCard";

interface AddBookProps {
	onBookAdded: (book: Book) => void
}

export default function AddBook({ onBookAdded }: AddBookProps) {
	const iconControls = useAnimationControls();

	async function handleClick() {
		const result = await window.electronAPI.books.pickAndAdd()
		if (result.success && result.book)
			onBookAdded(result.book)
	}

	return (
		<BookCard
			className="flex flex-col items-center cursor-pointer bg-gray-800/30"
			onClick={handleClick}
			onMouseEnter={() => iconControls.start({
				rotate: [0, -8, 8, -8, 8, 0],
				x: [0, -3, 3, -3, 3, 0],
				transition: {
					duration: 0.4,
					ease: "easeInOut"
				}
			})}
		>
			<h1 className="text-2xl font-semibold mt-5 underline">Add New Book</h1>
			<motion.div className="my-auto" animate={iconControls}>
				<CirclePlus size={80} />
			</motion.div>
		</BookCard>
	)
}
