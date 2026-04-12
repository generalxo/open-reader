import React from "react"
import { NAV_ITEMS } from "../../../config/navItems"
import SidebarItem from "./SidebarItem"

export default function Sidebar() {
	return (
		<div
			className="flex flex-col gap-3 p-3 pl-5 pt-5 w-40 bg-gray-800 drop-shadow-xl"
			style={{
				borderTopRightRadius: "1.25rem",
				borderBottomRightRadius: "1.25rem",
				cornerTopRightShape: "bevel",
				cornerBottomRightShape: "bevel",
			} as React.CSSProperties}
		>
			{
				NAV_ITEMS.map((item) => (
					<SidebarItem key={item.to} item={item} />
				))
			}
		</div >
	)
}
