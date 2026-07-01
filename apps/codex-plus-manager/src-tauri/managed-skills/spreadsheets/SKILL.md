---
name: spreadsheets
description: Use this skill when the user asks to analyze, clean, transform, summarize, or generate spreadsheets such as CSV, XLSX, Excel, or Google Sheets exports.
---

# Spreadsheets

Work with spreadsheet-like data safely and accurately.

## Workflow

1. Identify the file type, sheet names, header rows, units, date formats, and the user's requested output.
2. Inspect the data before transforming it. Check row counts, missing values, duplicate keys, abnormal values, and column types.
3. Use formulas, pivots, charts, or scripts only when they improve the result. Keep the workflow reproducible.
4. For CSV/XLSX files, prefer structured libraries such as `python` with `pandas`/`openpyxl`, or Node libraries when Python is unavailable.
5. Preserve the original file unless the user explicitly asks to overwrite it.
6. Validate totals after transformations, especially when filtering, grouping, or merging.

## Output

Return clear findings, transformed data, or a new spreadsheet file as requested. Include assumptions and any data quality issues that affect the result.
