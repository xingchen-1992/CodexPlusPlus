---
name: markitdown
description: Use this skill when the user asks to convert PDF, DOCX, PPTX, XLSX, HTML, CSV, or other documents into clean Markdown.
---

# Markitdown

Convert documents into clean, readable Markdown while preserving useful structure.

## Workflow

1. Identify the input type and whether the user wants full conversion, summary, extraction, or cleanup.
2. Prefer reliable document conversion tools when available, such as `markitdown`, `pandoc`, `python-docx`, `python-pptx`, `openpyxl`, or local text extraction utilities.
3. If a dependency is missing, install the smallest required dependency in the current environment and retry. Do not install broad toolchains unless necessary.
4. Preserve headings, lists, tables, links, code blocks, and image references where possible.
5. For scanned PDFs or images, say OCR is required before conversion.
6. Clean the final Markdown: remove duplicate page headers, footers, broken line wraps, and irrelevant metadata.

## Output

Return the Markdown content or write a `.md` file when the user asks for a file. Mention any parts that could not be extracted reliably.
