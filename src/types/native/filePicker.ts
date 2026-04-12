export type FilePickerResult =
	| { cancelled: true }
	| { cancelled: false; filePaths: string[] }
	| { error: string }
