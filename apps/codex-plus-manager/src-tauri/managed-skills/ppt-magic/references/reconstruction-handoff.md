# Reconstruction Handoff

Use this reference when converting approved picture-PPT pages into editable PPTX.

## Handoff Package

For each page, pass:

1. approved 4K page image
2. confirmed text baseline
3. page number and page title
4. visual notes for major regions
5. user-approved simplifications, if any

## Relationship to slide-image-to-editable-pptx

Use `slide-image-to-editable-pptx` as the reconstruction discipline:

- measure the approved page layout first
- decompose into visual asset, structure, and content layers
- regenerate backgrounds and icons as clean high-resolution no-text assets
- rebuild text as native editable PowerPoint text
- render and compare against the approved page

## Reconstruction Rules

Do not:

- redesign the page
- invent or change text
- change the page hierarchy
- replace the page with a generic office layout
- use the approved full-page screenshot as the only slide content in the editable deck

Do:

- preserve reading path
- preserve region proportions
- preserve visual dominance and hierarchy
- preserve color balance
- keep complex decorative visuals as assets when native shapes would look crude

If the editable version drifts from the approved image, fix the reconstruction instead of changing the approved design.
