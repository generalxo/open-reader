import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'

export const Route = createFileRoute('/testing/')({
	component: RouteComponent,
})

function RouteComponent() {
	const [bookPath, setBookPath] = useState("D:/Books/normal books/artofdrawingfantasycharacters.epub")
	const [zipTestResult, setZipTestResult] = useState<string[] | null>(null)
	const [rootFileResult, setRootFileResult] = useState<string | null>(null)
	const [coverPathResult, setCoverPathResult] = useState<string | null>(null)
	const [entryResult, setEntryResult] = useState<string | null>(null)
	const entryNameRef = useRef<HTMLInputElement>(null)

	return (
		<div className='flex flex-col w-full gap-3'>
			<div className='flex flex-row my-5 self-center'>
				<h1 className='text-4xl font-bold'>My Library</h1>
			</div>

			<input
				type='text'
				value={bookPath}
				onChange={(e) => setBookPath(e.target.value)}
				placeholder='Book path (.epub)'
				className='px-3 py-1 bg-neutral-800 rounded text-sm text-neutral-200 placeholder-neutral-500 outline-none'
			/>

			<div className='flex flex-col gap-2'>
				<button
					className='self-start px-3 py-1 bg-neutral-700 rounded text-sm hover:bg-neutral-600'
					onClick={async () => {
						const result = await window.electronAPI.zip.zipTest(bookPath)
						setZipTestResult(result)
					}}
				>
					zipTest
				</button>
				{zipTestResult && (
					<pre className='bg-neutral-900 text-neutral-300 text-xs p-3 rounded overflow-auto max-h-48'>
						{zipTestResult.join('\n')}
					</pre>
				)}
			</div>

			<div className='flex flex-col gap-2'>
				<button
					className='self-start px-3 py-1 bg-neutral-700 rounded text-sm hover:bg-neutral-600'
					onClick={async () => {
						const result = await window.electronAPI.zip.getRootFileData(bookPath)
						setRootFileResult(result ?? '(null)')
					}}
				>
					getRootFileData
				</button>
				{rootFileResult && (
					<pre className='bg-neutral-900 text-neutral-300 text-xs p-3 rounded overflow-auto max-h-48'>
						{rootFileResult}
					</pre>
				)}
			</div>

			<div className='flex flex-col gap-2'>
				<button
					className='self-start px-3 py-1 bg-neutral-700 rounded text-sm hover:bg-neutral-600'
					onClick={async () => {
						const result = await window.electronAPI.zip.getBookCoverPath(bookPath)
						setCoverPathResult(result ?? '(null)')
					}}
				>
					getBookCoverPath
				</button>
				{coverPathResult && (
					<pre className='bg-neutral-900 text-neutral-300 text-xs p-3 rounded overflow-auto max-h-48'>
						{coverPathResult}
					</pre>
				)}
			</div>

			<div className='flex flex-col gap-2'>
				<div className='flex flex-row gap-2 items-center'>
					<input
						ref={entryNameRef}
						type='text'
						placeholder='Entry path inside ZIP (e.g. OEBPS/Text/chapter01.xhtml)'
						className='flex-1 px-3 py-1 bg-neutral-800 rounded text-sm text-neutral-200 placeholder-neutral-500 outline-none'
					/>
					<button
						className='px-3 py-1 bg-neutral-700 rounded text-sm hover:bg-neutral-600 shrink-0'
						onClick={async () => {
							const entry = entryNameRef.current?.value?.trim()
							if (!entry) return
							const result = await window.electronAPI.zip.readEntry(entry, bookPath)
							setEntryResult(result || '(empty)')
						}}
					>
						readEntry
					</button>
				</div>
				{entryResult && (
					<pre className='bg-neutral-900 text-neutral-300 text-xs p-3 rounded overflow-auto max-h-96'>
						{entryResult}
					</pre>
				)}
			</div>
		</div>
	);
}
