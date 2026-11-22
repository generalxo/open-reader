import { describe, expect, it } from 'vitest'
import { parseNavToc, parseNcxToc } from '../../../src/reader/toc'

const NAV = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<body>
	<nav epub:type="landmarks"><ol><li><a href="cover.xhtml">Cover</a></li></ol></nav>
	<nav epub:type="toc" id="toc">
		<h1>Contents</h1>
		<ol>
			<li><a href="../Text/ch1.xhtml"><span>Chapter</span>
				<span>One</span></a></li>
			<li><span>Part Two</span>
				<ol>
					<li><a href="../Text/ch%202.xhtml#sec-1">Section 1</a></li>
					<li><a href="#local">Local anchor</a></li>
				</ol>
			</li>
			<li><a href="https://example.com">Website</a></li>
		</ol>
	</nav>
</body>
</html>`

const NCX = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
	<navMap>
		<navPoint id="n1" playOrder="1">
			<navLabel><text>Introduction</text></navLabel>
			<content src="Text/intro.xhtml"/>
			<navPoint id="n2" playOrder="2">
				<navLabel><text>  Why   draw? </text></navLabel>
				<content src="Text/intro.xhtml#why"/>
			</navPoint>
		</navPoint>
		<navPoint id="n3" playOrder="3">
			<navLabel><text>Chapter 1</text></navLabel>
			<content src="Text/ch1.xhtml"/>
		</navPoint>
	</navMap>
</ncx>`

describe('parseNavToc', () => {
	it('reads the toc nav (not landmarks), with nested lists, labels and resolved hrefs', () => {
		expect(parseNavToc(NAV, 'OEBPS/Nav/nav.xhtml')).toEqual([
			{ label: 'Chapter One', href: 'OEBPS/Text/ch1.xhtml', fragment: null, children: [] },
			{
				label: 'Part Two', href: null, fragment: null, children: [
					{ label: 'Section 1', href: 'OEBPS/Text/ch 2.xhtml', fragment: 'sec-1', children: [] },
					{ label: 'Local anchor', href: 'OEBPS/Nav/nav.xhtml', fragment: 'local', children: [] },
				],
			},
			{ label: 'Website', href: null, fragment: null, children: [] },
		])
	})

	it('falls back to the first nav and to HTML parsing for broken XML', () => {
		const html = '<html><body><nav><ol><li><a href="ch1.xhtml">One<br></a></li></ol></nav></body></html>'

		expect(parseNavToc(html, 'nav.xhtml')).toEqual([{ label: 'One', href: 'ch1.xhtml', fragment: null, children: [] }])
	})

	it('returns an empty list when there is no nav', () => {
		expect(parseNavToc('<html xmlns="http://www.w3.org/1999/xhtml"><body/></html>', 'nav.xhtml')).toEqual([])
	})
})

describe('parseNcxToc', () => {
	it('reads nested navPoints relative to the NCX file', () => {
		expect(parseNcxToc(NCX, 'OEBPS/toc.ncx')).toEqual([
			{
				label: 'Introduction', href: 'OEBPS/Text/intro.xhtml', fragment: null, children: [
					{ label: 'Why draw?', href: 'OEBPS/Text/intro.xhtml', fragment: 'why', children: [] },
				],
			},
			{ label: 'Chapter 1', href: 'OEBPS/Text/ch1.xhtml', fragment: null, children: [] },
		])
	})

	it('returns an empty list without a navMap', () => {
		expect(parseNcxToc('<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"/>', 'toc.ncx')).toEqual([])
	})
})
