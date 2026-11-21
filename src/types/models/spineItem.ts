export interface SpineItem {
	id: string   // manifest item id
	href: string // path within the ZIP (decoded, e.g. 'OEBPS/Text/ch 1.xhtml')
	size: number // uncompressed size in bytes, 0 if unknown
}
