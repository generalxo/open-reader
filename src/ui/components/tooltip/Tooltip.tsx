import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import type { RefObject } from 'react'

type Placement = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
	targetRef: RefObject<HTMLElement | null>
	text: string
	placement?: Placement
	delayMs?: number
}

interface Position {
	top: number
	left: number
}

const GAP = 6
const EST_H = 28

function resolvePosition(rect: DOMRect, text: string, placement: Placement): Position {
	const EST_W = text.length * 7 + 16

	let p = placement

	if (p === 'top'    && rect.top    < EST_H + GAP)                       p = 'bottom'
	if (p === 'bottom' && rect.bottom + EST_H + GAP > window.innerHeight)  p = 'top'
	if (p === 'left'   && rect.left   < EST_W + GAP)                       p = 'right'
	if (p === 'right'  && rect.right  + EST_W + GAP > window.innerWidth)   p = 'left'

	const top = p === 'top'    ? rect.top  - EST_H - GAP
	          : p === 'bottom' ? rect.bottom + GAP
	          : rect.top + rect.height / 2 - EST_H / 2

	const left = p === 'left'  ? rect.left - EST_W - GAP
	           : p === 'right' ? rect.right + GAP
	           : rect.left + rect.width / 2 - EST_W / 2

	return { top, left }
}

export default function Tooltip({ targetRef, text, placement = 'top', delayMs = 500 }: TooltipProps) {
	const [visible, setVisible] = useState(false)
	const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		const el = targetRef.current
		if (!el) return

		const show = () => {
			timerRef.current = setTimeout(() => {
				const rect = el.getBoundingClientRect()
				setPosition(resolvePosition(rect, text, placement))
				setVisible(true)
			}, delayMs)
		}

		const hide = () => {
			if (timerRef.current) clearTimeout(timerRef.current)
			setVisible(false)
		}

		el.addEventListener('mouseenter', show)
		el.addEventListener('mouseleave', hide)

		return () => {
			el.removeEventListener('mouseenter', show)
			el.removeEventListener('mouseleave', hide)
		}
	}, [targetRef, text, placement, delayMs])

	return createPortal(
		<AnimatePresence>
			{visible && (
				<motion.div
					style={{ top: position.top, left: position.left, position: 'fixed' }}
					className="z-[9999] pointer-events-none px-2 py-1 rounded-md text-xs bg-[--color-bg-raised] text-[--color-text] shadow-lg whitespace-nowrap"
					initial={{ opacity: 0, scale: 0.92 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.92 }}
					transition={{ duration: 0.1 }}
				>
					{text}
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	)
}
