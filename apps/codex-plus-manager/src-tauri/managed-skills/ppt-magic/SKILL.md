---
name: ppt-magic
description: >
  Create high-finish business PowerPoint decks from source documents through a
  picture-first approval workflow: document parsing, pagination planning, style
  exploration, whole-page picture-PPT previews, user approval, 4K final page
  images, and editable PPTX reconstruction through slide-image-to-editable-pptx.
  Use when the user wants a proposal deck, bid deck, government/business report,
  English or Chinese presentation, cover style options, page-by-page picture
  drafts, or an editable PPTX that must preserve approved visual quality and
  strict source-text fidelity.
---

# PPT-magic

Use `ppt-magic` to create polished PPT decks from source documents when visual quality matters.

The default route is not direct document-to-editable-PPTX. The route is:

`source document -> page plan -> whole-page picture-PPT previews -> user approval -> 4K approved pages -> editable reconstruction -> final PPTX`

## Non-Negotiable Rules

1. **Whole-page review only.** Any draft, sample, style option, or preview in the picture-PPT route must be a complete slide image, not a background, wireframe, layout board, or placeholder template.
2. **Draft means finished-look preview.** A draft should already look like a real business PPT page. The difference between draft and final is refinement level, not object type.
3. **Confirmed page text is immutable.** Do not invent, rewrite, paraphrase, summarize, or add visible slide text after page copy is confirmed. Use only line breaks, text splitting, style changes, and placement changes unless the user explicitly approves wording changes.
4. **2K for review, 4K for approved production.** Use 16:9 2K by default for fast review drafts. Generate 16:9 4K only after the user approves the page or style direction.
5. **Editable reconstruction is translation, not redesign.** Once a whole-page image is approved, the editable PPTX stage must reconstruct that approved page instead of creating a new layout.
6. **Low-quality assets are blocking failures.** Reject blurry, muddy, artifacted, undersized, or dirty-edge visuals before they enter final output.

Read [references/content-fidelity.md](references/content-fidelity.md) when page wording is confirmed.
Read [references/quality-and-qa.md](references/quality-and-qa.md) before calling a page or deck ready.
Read [references/reconstruction-handoff.md](references/reconstruction-handoff.md) before converting approved images to editable PPTX.

## Workflow

### Stage 1: Source Lock

Read the source document and create a page-by-page content baseline.

Produce:

- deck outline
- pagination plan
- page title and core message
- visible page text baseline
- source range for each page

Stop for confirmation before generating page images when the user is still deciding structure.

### Stage 2: Style Exploration

For cover or style options, generate whole-page picture-PPT previews with identical confirmed text.

Do:

- create 2-3 whole-page style options when the user asks to choose a style
- vary composition, palette, visual metaphor, and page rhythm
- keep all visible text identical across options

Do not:

- place "Option 1", "Style A", or any comparison label on the slide
- generate only background plates
- add slogans or captions not present in the source

### Stage 3: Whole-Page Picture-PPT Preview

Generate each reviewed page as one complete image.

Default:

- review draft: `16:9 2K`
- confirmed production image: `16:9 4K`
- image engine: local `crs-image`

Use a full-page prompt that includes:

- the confirmed visible text
- the page role and business message
- the locked deck visual DNA
- the required layout diversity note
- strict no-extra-text instructions

The preview should let the user judge taste, quality, hierarchy, and business suitability, not merely layout.

### Stage 4: User Approval

Only approved whole-page images can move forward.

If the user rejects a page for aesthetics, regenerate the whole page. Do not patch a weak page by layering text or shapes onto a bad background.

### Stage 5: 4K Approved Page Output

After approval, regenerate or refine the selected page at 16:9 4K.

This stage preserves the approved composition. It is not a new design round unless the user explicitly requests redesign.

### Stage 6: Editable Reconstruction

Use the `slide-image-to-editable-pptx` discipline for the back half.

Handoff package:

- approved 4K page image
- confirmed text baseline
- page order and page identity
- notes on structural vs decorative visual regions if known

Rebuild:

- background and complex decorative visuals as clean no-text assets
- simple geometry as editable PowerPoint shapes
- all readable text as native editable PowerPoint text

Do not use the approved full-page screenshot as a single slide background in the editable PPTX except for a separate image-only preview deck.

### Stage 7: Deck Assembly and QA

Assemble approved editable slides into the final PPTX and verify:

- text fidelity
- visual fidelity against approved images
- slide-to-slide style unity
- layout diversity
- editability

## CRS Image Usage

Use the local CRS image tool:

```powershell
crs-image doctor --json
crs-image gen --prompt-file prompt.txt --size "16:9 2K" --quality high -o page-draft.png --json
crs-image gen --prompt-file prompt.txt --size "16:9 4K" --quality high -o page-final.png --json
```

Use `2K` for draft review unless the user explicitly requests 4K drafts.

## Output Modes

Choose the output mode based on where the project is in the workflow:

- **planning only:** pagination and content plan
- **style options:** 2-3 whole-page cover/style images
- **page draft:** one 2K whole-page page preview
- **approved page:** one 4K whole-page final image
- **image PPTX:** one image per slide for visual approval archives
- **editable PPTX:** reconstructed editable deck after page approval

## Common Failures

- Background-first thinking: generating a pretty background and adding text later.
- Template thinking: generating empty cards or layout placeholders instead of a finished page.
- Text drift: adding helpful-sounding labels, subtitles, or summary words not in the confirmed content.
- Premature editability: rebuilding before the picture page is visually approved.
- Reconstructive redesign: making the editable slide prettier but different from the approved image.

When a failure appears, return to the correct stage instead of patching around it.
