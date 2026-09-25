# Notion companion page

Only build this if a Notion MCP is connected. Notion does not accept custom colour, so the page cannot carry the HTML palette. It carries the structure instead, using Notion's own block vocabulary properly rather than dumping flat markdown.

## Page setup

- **Icon:** an emoji that matches the subject matter. Keep it stable if the page is ever republished.
- **Cover:** must be an **external image URL**. A `file-upload://` reference is rejected by the cover field with `Invalid page cover URL`, even though the same reference works fine inside page content. Generate the image, host it, pass the URL. If no image tool is available, omit the cover.
- **Cover dimensions:** Notion crops to roughly 2.5:1. A 16:9 source crops to its middle band, so keep the important content out of the top and bottom thirds.

## Block order

1. Opening `<callout>` with the thesis in one or two sentences
2. `<table_of_contents/>`
3. Divider
4. Why the comparison matters, two short paragraphs
5. The method as a numbered list with bold leads
6. What to measure, as a table
7. The rules, as two or three coloured callouts
8. The worked example: a `<columns>` split, then the diff table, then a to do list
9. The prompt inside a toggle heading
10. Failure modes in a `red_bg` callout

## Syntax that matters

Indent children with **tabs**, not spaces. Untabbed children fall out of their parent block.

Callout with multiple paragraphs:

```
<callout icon="⚠️" color="red_bg">
	**First point.** Body text.
	**Second point.** Body text.
</callout>
```

Two columns:

```
<columns>
	<column>
		### Heading
		- item
	</column>
	<column>
		### Heading
		- item
	</column>
</columns>
```

Toggle heading, children indented:

```
### Copy this {toggle="true"}
	```plain text
	content
	```
```

Table with a header row:

```
<table fit-page-width="true" header-row="true">
	<tr>
		<td>**Token**</td>
		<td>**Subject**</td>
		<td>**Reference**</td>
	</tr>
</table>
```

Cells take rich text only. Use `**bold**` and backticks, never raw HTML tags.

## Gotchas

- A bare code fence gets a language auto detected, and a prompt will often be tagged `javascript` and syntax highlighted into nonsense. Tag it `plain text` explicitly.
- Use `<mention-page>` to reference an existing page. A `<page>` tag **moves** that page in as a child, and removing the tag later deletes it.
- Colours are from Notion's fixed set: `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`, each with a `_bg` variant. There is no custom hex.
- Keep colour to two or three callouts. A page where every block is tinted reads worse than a plain one.

## Verify

Fetch the page back after creating it and confirm the tables rendered as real Notion tables, the columns split, and the toggle contains its code block. Markdown that is slightly off produces a page that looks fine in the payload and broken on screen.

New pages are private. Tell the user they need to share it from Notion's own share menu, and never assume a link you return is publicly reachable.
