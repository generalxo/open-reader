import { ArrowDownAZ, Clock } from "lucide-react"

export default function LibraryNavBar() {

	return (
		<div className='flex flex-col w-full items-center mb-5'>
			<div className="flex flex-row gap-3">
				<div>
					<ArrowDownAZ>
						<title>
							Order from A to Z
						</title>
					</ArrowDownAZ>
				</div>
				<div>
					<Clock>
						<title>
							Order by most recently read
						</title>
					</Clock>
				</div>
				<p>Searchbar placeholder</p>
			</div>
		</div>
	)
}
