export interface ManifestItem {
	id: string
	href: string
	mediaType: string
	properties: string[] // EPUB 3 properties, e.g. ['nav'] or ['cover-image']
}
