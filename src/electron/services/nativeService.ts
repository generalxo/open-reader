import { dialog, shell } from 'electron'
import type { FilePickerResult } from '../../types/native/filePicker'

export type { FilePickerResult }

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:'])

export async function filePicker(pickFolder = false): Promise<FilePickerResult> {
	try {
		const { canceled, filePaths } = await dialog.showOpenDialog({
			properties: pickFolder ? ['openDirectory'] : ['openFile'],
			filters: pickFolder ? [] : [{ name: 'EPUB Files', extensions: ['epub'] }],
		})

		if (canceled)
			return { cancelled: true }

		if (filePaths.length < 1)
			throw new Error('No filepaths returned')

		return { cancelled: false, filePaths }
	} catch (err: unknown) {
		return { error: err instanceof Error ? err.message : String(err) }
	}
}

// Only web links may leave the app; file:, custom protocols etc. could launch local programs.
export function isSafeExternalUrl(url: string): boolean {
	try {
		return EXTERNAL_PROTOCOLS.has(new URL(url).protocol)
	} catch {
		return false
	}
}

export async function openExternal(url: string): Promise<void> {
	if (!isSafeExternalUrl(url))
		return

	await shell.openExternal(url)
}
