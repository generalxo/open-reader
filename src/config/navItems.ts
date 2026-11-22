import type { LucideIcon } from "lucide-react";
import { BookIcon, HouseIcon } from "lucide-react";

export interface NavItem {
	label: string;
	to: string;
	icon: LucideIcon;
	exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
	{ label: "Home", to: "/", icon: HouseIcon },
	{ label: "Library", to: "/library", icon: BookIcon },
]
