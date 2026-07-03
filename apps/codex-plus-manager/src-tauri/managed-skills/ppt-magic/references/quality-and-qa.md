# Quality and QA

Use this reference before calling a page or deck ready.

## Picture-PPT Preview QA

The review image must pass all checks:

- It is a complete slide image.
- It looks like a finished PPT page, not a template.
- It is visually consistent with the chosen deck style.
- It is good enough for the user to judge aesthetics, not just structure.
- It does not rely on a background-first / overlay-later workflow.

If any check fails, regenerate the whole page.

## Asset Quality QA

Reject assets that are:

- blurry
- muddy
- artifacted
- weak at edges
- too small for their role
- dirty around alpha edges
- readable only as tiny thumbnails

Final full-slide images should be `16:9 4K` unless the user explicitly chooses another production size.

## Text QA

Check:

- every visible word is approved
- no extra labels or slogans appear
- numbers, dates, names, and punctuation are preserved
- text is sharp and legible

Unapproved text drift is a blocking failure.

## Deck QA

Check:

- one deck-wide visual DNA
- varied adjacent layouts
- consistent typography and color system
- no page-number artifacts unless explicitly requested
- client-facing polish

## Editable QA

For editable reconstruction, verify:

- all readable text is native editable text
- simple structures are editable shapes where practical
- complex visual treatment uses clean no-text assets
- the editable slide still matches the approved picture page
- the original full-slide screenshot is not used as the only editable-slide background
