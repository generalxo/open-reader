import { app, BrowserWindow } from 'electron';
import path from 'path';
import { isDev } from './devutils.js';
import { initializeDatabase } from './db/index.js';
import { registerZipHandlers } from './ipc/zipHandler.js';
import { registerDbHandlers } from './ipc/dbHandler.js';
import { registerNativeHandlers } from './ipc/nativeHandler.js';
import { registerReaderHandlers } from './ipc/readerHandler.js';

registerZipHandlers();
registerDbHandlers();
registerNativeHandlers();
registerReaderHandlers();

app.on('ready', async () => {
	await initializeDatabase();

	const mainWindow = new BrowserWindow({
		webPreferences: {
			preload: path.join(app.getAppPath(), '/dist-electron/electron/preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		}
	});

	mainWindow.webContents.on('will-navigate', (event, url) => {
		const appUrl = isDev() ? 'http://localhost:1337' : `file://${path.join(app.getAppPath(), '/dist-react/index.html')}`
		if (!url.startsWith(appUrl)) event.preventDefault()
	})

	mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

	if (isDev()) {
		mainWindow.loadURL('http://localhost:1337');
	} else {
		mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
	}
});
