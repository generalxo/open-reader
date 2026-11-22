import { useCallback, useState } from 'react'
import { parseSettings, type ReaderSettings } from '../../../reader/settings'

const STORAGE_KEY = 'open-reader:reader-settings'

function loadSettings(): ReaderSettings {
	try {
		return parseSettings(localStorage.getItem(STORAGE_KEY))
	} catch {
		return parseSettings(null)
	}
}

// App-wide reader preferences, kept in localStorage (persisted in Electron's userData).
export function useReaderSettings() {
	const [settings, setSettings] = useState<ReaderSettings>(loadSettings)

	const updateSettings = useCallback((change: Partial<ReaderSettings>) => {
		setSettings((current) => {
			const next = { ...current, ...change }
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
			} catch {
				// Not persisting is fine; the change still applies for this session
			}

			return next
		})
	}, [])

	return { settings, updateSettings }
}
