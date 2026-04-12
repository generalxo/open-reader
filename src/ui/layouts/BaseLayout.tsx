import type { ReactNode } from "react";
import Sidebar from "../components/sidebar/Sidebar";

type LayoutProps = {
	children: ReactNode;
}

export default function BaseLayout({ children }: LayoutProps) {
	return (
		<div className="flex flex-row h-full bg-linear-to-r from-[#334155] to-[#0f172a]">
			<Sidebar />
			<div className="p-5 w-full">
				{children}
			</div>
		</div>
	);
}
