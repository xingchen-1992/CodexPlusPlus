---
name: slide-image-editable-pptx
description: Use this skill when the user provides a slide screenshot or slide image and wants it converted into an editable PowerPoint/PPTX slide.
---

# Slide Image - Editable PPTX

Convert slide screenshots into editable PowerPoint content. The goal is a high-fidelity editable PPTX, not a flat image pasted into a slide.

## Workflow

1. Inspect the image layout: canvas ratio, title, text blocks, charts, tables, icons, shapes, colors, and spacing.
2. Recreate the slide using editable elements where possible: text boxes, shapes, lines, tables, charts, and images.
3. Match the visual hierarchy first: title size, section grouping, alignment, and whitespace.
4. Use a pasted image only for complex photos, logos, or illustrations that cannot reasonably be rebuilt.
5. If exact fonts are unavailable, use a close system font and preserve weight, size, and spacing.
6. After generating the PPTX, verify it opens and that text is editable.

## Output

Create an editable PPTX file when tooling is available. If a required dependency is missing, tell Codex to install the smallest required local package and retry.
