import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title?: string
	children: ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className="fixed inset-0 z-[9999] flex items-center justify-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				>
					<div className="absolute inset-0 bg-black/20" onClick={onClose} />

					<motion.div
						className="relative z-10 bg-gray-700 rounded-xl p-6 w-full max-w-sm shadow-xl"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.15 }}
					>
						{title && (
							<h2 className="text-[--color-text] font-semibold text-base mb-4">{title}</h2>
						)}
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	)
}
