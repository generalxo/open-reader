import { Link } from "@tanstack/react-router"
import type { NavItem } from "../../../config/navItems.ts"
import { motion } from "motion/react"

export default function SidebarItem({ item }: { item: NavItem }) {
	const Icon = item.icon

	return (
		<Link to={item.to} activeOptions={{ exact: item.exact }} className="no-underline">
			<motion.div
				className="flex flex-row gap-3 origin-left"
				whileHover={{
					scale: 1.1,
					transition: {
						type: "spring",
						stiffness: 270,
						damping: 15
					}
				}}
			>
				<Icon size={24} strokeWidth={2} className="my-auto" color="white" />
				<p className="text-xl font-semibold leading-none text-white">{item.label}</p>
			</motion.div>
		</Link>
	)
}
