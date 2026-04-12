import type { ComponentPropsWithoutRef } from "react"

type BookCardProps = ComponentPropsWithoutRef<"div">

export default function BookCard({ children, className, ...props }: BookCardProps) {
	return (
		<div className={`flex flex-col aspect-[1/1.414] w-full rounded-xl ${className ?? ""}`} {...props}>
			{children}
		</div>
	)
}
