import { dialog } from 'electron'
import type { FilePickerResult } from '../../types/native/filePicker'

export type { FilePickerResult }

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
