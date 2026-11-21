import { protocol } from 'electron'
import { BOOK_SCHEME } from '../../shared/bookUrl'
import { handleBookRequest } from '../services/bookProtocolService'

// Must run before app 'ready'. 'standard' gives book:// normal URL semantics (relative links
// and origins); 'secure' + 'corsEnabled' + 'supportFetchAPI' let the renderer fetch() from it.
export function registerBookScheme() {
	protocol.registerSchemesAsPrivileged([
		{
			scheme: BOOK_SCHEME,
			privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
		},
	])
}

// Must run after app 'ready'.
export function registerBookProtocol() {
	protocol.handle(BOOK_SCHEME, (request) => handleBookRequest(request))
}
