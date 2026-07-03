---
name: slide-image-to-editable-pptx
description: >
  Convert PPT slide screenshots / style-reference images into editable PPTX
  using layout fidelity plus semantic visual reconstruction. The output keeps
  text, structure, hierarchy, proportions, and visual-asset positions aligned
  to the source, while backgrounds and icons must be regenerated as clean
  high-resolution no-text CRS Image assets that match the source meaning and style.
---

# Slide Image → Editable PPTX

You are converting slide screenshots into editable PowerPoint files.
The goal is **layout fidelity + semantic visual reconstruction**. The output
PPT should preserve the source slide's layout, hierarchy, proportions, text
positions, and content, while rebuilding non-text visuals as clean replaceable
assets that match the source meaning and visual style.

## Reconstruction Goal

Do not chase pixel-perfect duplication unless the user explicitly asks for it.
The preferred target is:

1. Preserve the original slide's layout, hierarchy, proportions, bounding boxes, text positions, and reading order.
2. Rebuild all readable text as PPT-native editable text.
3. Rebuild non-text visuals, including backgrounds, decorative illustrations, and icons, as high-resolution no-text assets generated with `@crs image` / the local `crs-image` command based on the source slide's meaning and visual style.
4. Place generated visual assets back into the original source-aligned positions and sizes so the composed slide matches the source composition.
5. Preserve exact identity only for assets whose identity matters, such as logos, official seals, QR codes, certification marks, and real data charts. Do not crop ordinary icons from the source screenshot for final use.

Priority order is strict:

1. **Layout fidelity first**: element positions, sizes, spacing, and hierarchy must stay close to the source.
2. **Editability second**: text and simple structures must remain PPT-native.
3. **Semantic visual quality third**: CRS Image assets may improve the look, but must not change the composition.

If layout fidelity and visual asset creativity conflict, layout fidelity wins.

## Execution Discipline

Use a **measure-first, asset-second, build-third** workflow. Do not start image generation or PPT coding until the source layout is measured and written down.

Required sequence for every task:

1. Create a source layout contract with pixel bboxes for the slide, major regions, every text block, every icon, every card/panel, footer/banner, logo, and background/illustration region.
2. Generate or preserve assets only after the layout contract is complete.
3. QA generated assets before inserting them into PPT.
4. Build the PPT using the measured bboxes. Do not adjust placement by vague visual preference unless correcting an explicit mismatch.
5. Render, compare, fix, and re-render at least once.

If a source image contains many icons, still measure and list every icon separately. Treat each icon as its own element unless the user explicitly asks for a combined asset.

Use image-assisted measurement whenever possible. Manual bbox estimates are acceptable only for the first pass; after the first render, correct any visible drift in the layout map before final export.

For nested or complex elements, distinguish these bbox types instead of collapsing everything into one box:

- `measured_bbox_px`: the visible boundary in the source screenshot
- `placement_bbox_px`: the actual PPT placement rectangle
- `asset_bbox_px`: the generated asset canvas or visual region, especially when padding, shadows, circular badges, inner icons, or decorative rings are involved

Measure outer containers, inner icons, shadows, connectors, and text separately when they have different visual boundaries.

### Speed Discipline

Optimize elapsed time without weakening the reconstruction contract:

1. **Semi-automate layout first**: Read the source image dimensions programmatically. Use OCR, edge detection, color sampling, or image-assisted rulers when available to draft text, card, icon, footer, and diagram bboxes. Manually correct the draft instead of hand-writing every coordinate from zero.
2. **Gate before parallel generation**: Generate 2-3 representative assets first, including one icon and one large/complex asset when present. After the samples pass transparency, style, text-ban, bbox, and contrast checks, generate the remaining independent assets in parallel where the tooling supports it.
3. **Keep one file per semantic icon**: Parallel generation is allowed; icon sheets are still not the default. Every icon must remain its own request/output/QA item.
4. **Avoid full background regeneration loops**: Generate the 4K background once with strong region constraints. If only small conflicts remain, prefer cropping, masking, transparency adjustment, or PPT-native cover shapes over repeatedly regenerating the whole background.
5. **Build with reusable helpers**: Use small PPT helper functions for repeated business-slide components such as cards, icon badges, footer process bars, orbit nodes, section labels, and safe connector lines. Do not rewrite the same component geometry for every element.
6. **Validate in layers**: Run quick structural/XML checks before expensive PowerPoint rendering. Use full render/export for the first assembled preview and the final check, not after every tiny code edit.

## Core Principle: Three-Layer Decomposition

Every pixel in the source image belongs to exactly one of three layers:

| Layer | What it contains | How to implement | Editable? |
|-------|-----------------|------------------|-----------|
| **A — Visual Asset** | Complex illustrations, decorative backgrounds, photos, semantic icons, scientific figures, maps, radar scenes, waveforms, heatmaps, campus sketches, device drawings, textured decorations | Clean high-resolution no-text PNG generated with `@crs image` / the local `crs-image` command based on source meaning and visual style. Preserve or trace the original only when exact identity matters | Replaceable (move/resize/delete), not internally editable |
| **B — Structure** | Solid color rectangles, rounded rectangles, circles, lines, arrows, dividers, panel frames, card backgrounds, badges, gradient bars, simple geometric decorations | PPT-native shapes via `$slides` / `presentation-skill` (PptxGenJS) | Fully editable |
| **C — Content** | All readable text: titles, subtitles, body text, labels, captions, page numbers, footer text, formula text, table text, card headings, legend labels | PPT-native text boxes via `$slides` / `presentation-skill` (PptxGenJS) | Fully editable |

**The key insight**: Treat the source screenshot as a layout and style reference, not as a background to paste. Never bake text into a generated image. Never use crude PPT shapes to approximate a complex visual. Never use a full-slide screenshot as background. Backgrounds and icons must be regenerated as one or more high-resolution no-text CRS Image assets that match the source content and visual style, then composed behind editable PPT structure and text at source-aligned positions.

If a visual region will have PPT-native editable text over it, the underlying visual asset must also be text-free. Do not place editable text on top of a cropped or preserved screenshot/photo region that still contains the same readable words, even faintly. If a preserved image region contains source text, either remove the text completely, mask it cleanly, or replace the region with a regenerated no-text asset before overlaying editable text.

## Workflow

### Phase 1: Layout and Semantic Analysis

For EACH source image, produce a structured analysis. Do not skip any slide. Do not infer from one slide what another contains — inspect each one.

#### Step 1.1: Observe and catalog

Look at the image carefully. Identify every distinct text, structure, and visual-asset region. For each element, determine:

```
{
  "element_id": "s01_e01",
  "description": "distributed radar network illustration region to regenerate as a high-resolution no-text CRS Image asset",
  "bbox_percent": {"x": 45, "y": 10, "w": 55, "h": 80},
  "layer": "A",
  "implementation": "crs-image-generate",
  "z_order": 1,
  "notes": "Regenerate from the source meaning and visual style. Must NOT include any text labels. The title, axis labels, and page number are separate text elements."
}
```

The `bbox_percent` uses percentages of slide width/height (0-100) to specify position. This avoids pixel-count errors across different image resolutions. Generated CRS Image assets must be placed back into these source-aligned bounding boxes unless there is a clear visual reason to make a small adjustment.

#### Step 1.1a: Source layout map (required)

Before generating any CRS Image assets or writing PPT code, create a concise source layout map:

- slide size and aspect ratio
- machine-assisted measurements used, such as OCR boxes, detected card edges, sampled colors, or manual ruler notes
- title/subtitle bbox
- every card/panel bbox
- every semantic icon bbox, with role, target color, target size, and separate container/icon bboxes when present
- central diagram bbox
- every photo/visual asset bbox
- footer/banner bbox
- key alignment relationships, such as left column, center orbit, right media grid, bottom banner
- `style_lock` for repeated icon or asset groups
- `source_region_constraints` for generated backgrounds and large decorative assets

Use this map as the contract for reconstruction. CRS Image assets must be fitted into these measured regions; they must not introduce new dominant structures that compete with the original layout.

For fragile screenshot reconstruction, prefer a machine-readable map such as:

```json
{
  "source_size_px": {"w": 1754, "h": 994},
  "slide_aspect": "16:9",
  "elements": [
    {
      "id": "s01_icon_user_inquiry",
      "role": "user inquiry chat icon",
      "layer": "A",
      "measured_bbox_px": {"x": 705, "y": 326, "w": 58, "h": 52},
      "placement_bbox_px": {"x": 705, "y": 326, "w": 58, "h": 52},
      "asset_bbox_px": {"x": 705, "y": 326, "w": 58, "h": 52},
      "target_asset": "s01_icon_user_inquiry.png",
      "style_lock": "deep navy #0B3192, clean corporate monoline/solid hybrid, centered, transparent PNG, square composition, strong readable shape at small PPT size",
      "prompt_notes": "chat consultation concept, no text",
      "placement_rule": "fit exactly within bbox_px converted to slide coordinates"
    }
  ],
  "source_region_constraints": [
    "background robots remain in the lower-left source region",
    "right data dashboard remains in the right third",
    "title and card areas stay low-contrast and empty"
  ]
}
```

The PPT implementation must consume this map or mirror it directly in code constants. The map is the placement source of truth. For speed, generate the first layout map as a machine-assisted draft when possible, then manually correct only the visually important mismatches.

#### Step 1.1b: Bbox precision and region constraints

Record source-region constraints for every large generated asset. For example: robots remain in the lower-left 20%, a blue dashboard wall remains on the right third, glass architecture remains upper-right, and title/card regions stay low-contrast and empty.

Use separate bboxes for container shapes, inner icons, text, shadows, connector dots, and decorative rings. Do not use one large bbox for a badge if the outer circle, inner icon, and shadow need independent control.

After the first render, update `placement_bbox_px` if a visible mismatch appears. Do not hide bbox errors by shrinking assets arbitrarily.

#### Step 1.2: Classify elements strictly

Apply these rules in order:

1. **Is it readable text?** → Layer C (text box). This includes ALL text: titles, labels inside diagrams, axis labels, page numbers, footer text, card headings, bullet points, formula text. Even if text overlaps a complex visual, the text itself goes to Layer C.

2. **Is it a simple geometric shape?** (solid rectangle, rounded rectangle, circle, line, arrow, triangle, chevron, trapezoid — with solid fill or simple border) → Layer B (PPT shape). This includes panel backgrounds, card frames, title bars, dividers, badges, progress bars, simple decorative strips.

3. **Is it visually complex?** (illustration, photo, texture, gradient background with imagery, scientific figure, diagram with intricate line work, icon with detail beyond basic geometry) → Layer A (generated PNG or preserved figure). For non-informational backgrounds, regenerate a visually similar high-resolution no-text asset with `@crs image` instead of trying to recreate every detail with shapes.

4. **Is it a semantic icon?** (service headset, database, AI brain, chart, calendar, certificate, knowledge base, repair tool, response-level pyramid, etc.) → Prefer Layer A via `@crs image` when the source icon has curves, internal details, shadows, or a branded/illustrative style that would look crude as PPT shapes. Match the icon's meaning, approximate silhouette, color palette, size, and position; pixel-perfect reproduction is not required unless the user explicitly asks for exact icon matching. Do not crop ordinary icons out of the source screenshot; use the source icon only to infer meaning, style, bbox, and placement.

5. **Is it a micro platform/channel/brand entry cluster?** (for example: a compact row or grid of platform, app, channel, partner, or ecosystem entry icons with short labels) → Treat the container/card structure as Layer B, the readable labels as Layer C, and each recognition-bearing icon as its own Layer A asset unless the source icon is truly simple geometry. Do not abstract these clusters into generic same-shape badges, initials, placeholder glyphs, or one interchangeable icon style when the source relies on recognition.

#### Step 1.2a: Micro platform/channel/brand entry rule

This is a common failure case and must be handled explicitly.

Use this rule when a source region contains several small icons whose meaning depends on platform, channel, app-surface, partner, or brand recognition rather than generic function alone.

Typical examples:

- social/media/app/channel entry rows
- platform matrices with one icon per channel plus a label
- mini-program ecosystem blocks
- payment/channel badges
- partner/logo-lite strips where identity matters even if each mark is small

Required handling:

1. Measure the whole cluster bbox, then measure each icon bbox and each label bbox separately.
2. Keep the title bar, card container, separators, and background shapes as PPT-native structure.
3. Keep the labels as PPT-native editable text.
4. Generate or preserve each icon independently at source-aligned size and spacing. Do not replace the row with generic colored circles and single characters unless the source itself uses that style.
5. When the source row reads as a branded/channelized entry area, favor recognition fidelity and local visual rhythm over abstract icon consistency.
6. If exact identity matters and the icon is effectively a logo or official mark, preserve identity according to the identity-critical rule. If identity does not need exact preservation, still generate a visually faithful platform/channel icon rather than a generic placeholder.

#### Step 1.3: Identify shared vs. unique elements

- **Shared across slides**: header bar style, footer style, logo, page number format, background color
- **Unique per slide**: main content visuals, specific diagrams, data figures

Create a `slide_master_elements` list for shared elements, and per-slide element lists for unique content.

#### Step 1.4: Completeness self-check (required)

After finishing the element list for ALL slides, go back and re-examine each source image ONE MORE TIME with fresh eyes. This second pass focuses specifically on **small or easy-to-miss visual elements** that the first pass may have overlooked.

For each slide, ask yourself these questions:

1. **Small icons**: Are there any small icons (university seals, bullet-point icons, award badges, folder icons, chip icons, person icons, book icons, etc.) that I classified as Layer B (PPT shape) but are actually too detailed for simple shapes? If the icon has more than 3-4 visual features (gradients, shadows, internal detail, curves), reclassify it as Layer A and regenerate a clean semantic replacement with `@crs image`.

2. **Decorative details**: Are there small decorative elements I skipped entirely? Look in corners, edges, between cards, along dividers, and in footer/header areas. Things like: small wave patterns, dot grids, circuit-trace textures, line-art campus buildings, faint background motifs.

3. **In-card visuals**: For each card/panel on the slide, does it contain a small illustration or diagram inside it? These are frequently missed because the analyst focuses on the card frame (Layer B) and card text (Layer C) but forgets the small visual inside the card.

4. **Chart/figure decorations**: Around charts or data figures, are there small visual elements like target icons, antenna icons, signal-path illustrations, or comparison diagrams that I might have grouped with the chart but are actually separate Layer A elements?

5. **Count check**: Count the total Layer A elements per slide. A visually rich slide typically has 3-8 distinct visual assets. If a complex-looking slide has only 1-2 Layer A elements, something is likely missing — re-examine it.

If this second pass finds any missed elements, add them to the element list with a note: `"found_in": "completeness_check"`. Do NOT remove or modify any existing elements — only add.

### Phase 2: Visual Asset Generation

For each Layer A element, generate a clean high-resolution PNG using `@crs image` / the local `crs-image` command. Use the whole source slide to understand the topic, visual language, composition, and semantic role of each asset, then generate no-text replacements that fit the measured source bounding boxes.

Before generating assets, run `crs-image doctor --json` to confirm CRS Image is available. Use `--quality high` for final visual assets unless the user explicitly requests a faster or cheaper draft.

Use sample-gated parallel generation:

1. Generate representative samples first, one at a time, until the shared prompt/style approach is proven.
2. After sample QA passes, generate remaining independent assets in parallel when the tool/runtime supports multiple safe invocations.
3. Confirm every output file exists and passes QA before building the final PPT.
4. If a parallel batch produces inconsistent style, stop batching, tighten the prompt/style lock, and regenerate the affected assets.

The default approach is:

1. Generate semantic replacement assets with `@crs image`; preserve original pixels only for identity-critical assets.
2. Keep all text out of generated images.
3. Place each generated asset into the source-aligned bounding box identified in Phase 1.
4. Use source images as composition/style references, not as bitmap backgrounds.
5. Do not crop ordinary icons, decorative illustrations, or low-resolution visual fragments from the source screenshot for final PPT use.

For micro platform/channel/brand entry clusters, use a stricter default:

1. The card/container remains native PPT structure.
2. Each small icon is treated as its own asset decision, not as a text substitute.
3. The icon row must preserve source spacing, density, and per-item recognition cues.
4. Do not downgrade recognition-bearing icons into generic same-shape badges, initials, or interchangeable pictograms unless the screenshot already does that.

#### Background asset regeneration and stitching

Backgrounds are usually visual atmosphere, not editable content. After the source layout is measured, you may regenerate background regions with `@crs image` based on the slide's subject matter and style, then stitch those assets into the PPT behind native shapes and text.

Use regenerated background assets for:

- office/lab/campus/industrial scenes
- abstract technology textures, grids, waves, glows, and depth effects
- device or robot silhouettes that support the scene but are not the main data
- large decorative areas that would be slow or crude to rebuild as PPT shapes

Choose asset boundaries deliberately:

- One large no-text background asset is acceptable when it is a newly generated clean scene, not the original screenshot.
- Use multiple assets when the source has distinct regions, such as left robot area, right control-room area, top architecture, bottom light trail, or separate decorative motifs.
- Leave enough visual overlap or fade at edges so stitched regions do not show hard seams.
- Keep cards, rings, process bars, titles, labels, and all readable text outside the background image as native PPT elements.
- If using one full-slide regenerated background, verify that it is genuinely newly generated, contains no readable text, and does not replace the editable content layer.
- Background prompts must explicitly forbid dominant structural elements that will be rebuilt in PPT, such as big circles, orbit diagrams, cards, UI panels, charts, labels, badges, or foreground objects in text/card areas.
- Background prompts must include the source-region constraints from the layout map, such as "robots remain in the lower-left 20%", "blue dashboard remains on the right third", "upper glass architecture remains upper-right", and "left/top text region stays low-contrast and empty."
- If a generated background contains a large diagram-like shape that overlaps the planned PPT structure, regenerate or mask it before using it.
- If a generated background relocates source-dominant regions such as robots, screens, architecture, or light trails, regenerate it with stricter region constraints.

Example prompt:

> Bright futuristic robotics service center interior, white and ice-blue corporate style, glass architecture on the upper right, faint robots and service devices on the lower left, subtle data-screen area on the right, soft depth-of-field light, clean PowerPoint infographic background, low contrast so dark-blue text remains readable, aspect ratio 16:9. No text, no labels, no numbers, no letters anywhere in the image.

#### Complex diagram and ring asset rule

Regenerate complex non-text center decorations, technology rings, halos, orbit diagrams, dashboard frames, textured panels, and dense linework as no-text transparent PNG assets when native PPT shapes would look crude. Keep every readable label and central heading as native PPT text above the asset.

Preserve structural editability for simple rectangles, lines, circles, and dividers. Use generated PNG only for decorative complexity that does not need internal editing.

Generate each complex decorative asset constrained to its measured bbox. Explicitly forbid text, cards, labels, badges, and unrelated foreground objects in the prompt.

#### Semantic icon replacement

For small functional icons, the reconstruction goal is semantic and stylistic fidelity, not exact pixel duplication. Once the icon's position, bounding box, and role are identified, generate a no-text replacement icon with `@crs image` that communicates the same concept and matches the slide's visual language. The original screenshot icon is only a reference for meaning, approximate shape, color, bbox, and placement; it should not be cropped and reused as the final PPT asset.

Use this approach when:

- the source icon is too detailed for native PPT shapes
- hand-built shapes would look crude or inconsistent
- the exact original icon is not a logo, trademark, seal, or regulated symbol
- the icon is decorative/supportive rather than data-bearing

Do NOT use semantic replacement when the icon is a brand logo, official seal, certification mark, QR code, data chart, or any symbol whose exact identity matters. Preserve or trace those more carefully.

Example prompt:

> Minimal service-support headset icon, centered, deep navy blue stroke and fill (#082D87), clean corporate PowerPoint infographic style, rounded geometry, subtle light-blue circular badge background, transparent PNG, aspect ratio 1:1. No text, no labels, no numbers, no letters anywhere in the image.

#### Icon style consistency lock

Before generating a group of related icons, define one exact `style_lock` sentence and reuse it verbatim in every icon prompt. Only change the semantic noun or concept for each icon.

Example `style_lock`:

> deep navy #0B3192, clean corporate monoline/solid hybrid, centered, transparent PNG, square composition, strong readable shape at small PPT size, no gradients unless the source uses them

If the first sample icon fails, update the `style_lock` and regenerate the sample before generating the rest. Do not mix icons with different stroke weights, fill styles, badge treatments, or visual density unless the source intentionally does so.

Default rule: **generate one icon per file**. Each semantic icon gets its own CRS Image request, output PNG, QA pass, and placement bbox.

Do not use an icon sheet by default. Icon sheets are fragile because generated spacing and cell boundaries are not guaranteed. Use an icon sheet only when ALL of these are true:

- the user explicitly accepts sheet generation or the icons are purely decorative and low risk
- the prompt specifies exact grid dimensions and one icon per cell
- you can verify the sheet boundaries before cropping
- every cropped icon passes the same QA checks as single-icon outputs

Never use an icon sheet to save time when bbox fidelity is important.

After placing icons, verify contrast against their containers. For example, blue circular badges usually need white icons; blue icons on blue badges are a failure even if the icon semantics are correct.

#### Sample asset gate for repeated icons

When a slide needs many similar icons, do not batch-generate all icons immediately. First generate and test a small representative set:

1. one primary-color content icon
2. one accent-color content icon
3. one sidebar/badge icon if present
4. one footer or special icon if present

Place these samples into a temporary PPT/render or a small test composition at their measured bboxes. Continue to batch generation only after checking:

- icon background is genuinely transparent or intentionally solid
- no checkerboard preview pattern is baked into the PNG
- no text, numbers, labels, or pseudo-letters appear
- color, stroke weight, and visual density match the source style
- size reads correctly at the final bbox
- icon contrast is sufficient on its actual container

If a sample fails, revise the prompt or post-processing before generating the remaining icons.

After samples pass, remaining icons may be generated concurrently as separate files using the same `style_lock`. Do not wait on each icon sequentially unless the image tool cannot safely handle parallel requests.

#### Generated asset QA

Before using any generated PNG in the final PPT, inspect or programmatically check it:

- **Transparency**: transparent-background icons must have a real alpha channel; remove baked checkerboard or near-white preview backgrounds.
- **Bounding box**: nontransparent pixels should be centered with sensible padding. Trim excess empty space, then re-canvas to a consistent square if needed.
- **Text ban**: reject/regenerate assets containing readable text, numbers, labels, or letter-like marks.
- **Color**: recolor or regenerate if the icon is too faint, wrong hue, or low contrast against the target container.
- **Scale**: test the icon at its final PPT size, not only as a large standalone preview.
- **Identity**: preserve/crop only identity-critical marks such as logos, official seals, QR codes, certification marks, and exact data figures.
- **Overlay conflict**: if PPT-native editable text will sit on top of this asset, confirm the underlying asset contains no residual readable source text in the same region. Reject or clean any asset that would create doubled words, ghost text, or shadow text under the editable layer.

For micro platform/channel/brand entry clusters, add these checks:

- **Recognition drift**: does each icon still read as the intended platform/channel at final slide size, or has it degraded into a generic badge?
- **Cluster rhythm**: do icon sizes, label widths, and horizontal gaps match the source cluster's compactness and cadence?
- **False abstraction**: did the reconstruction replace a recognition-specific row with generic same-shape badges, initials, or placeholder symbols that were not present in the source?
- **Container balance**: does the whitespace inside the card match the source, or did the cluster become too sparse after reconstruction?

For small icons, a 1:1 1K or 2K PNG is usually enough. For large backgrounds, use a source-appropriate high-resolution ratio such as 16:9 4K. Do not use one resolution preset for all asset types.

#### CRS Image Prompt Rules

1. **Be specific about content**: Don't say "a radar scene." Say "A bird's-eye view of a distributed radar network: 6 satellite dish antennas arranged in a hexagonal pattern around a central target (marked with a star), connected by dashed lines, on a dark blue coordinate grid background with axis markings from -200 to 200 km. The style is technical/scientific, with a dark blue (#0A1628) background and light blue/cyan (#31D7FF) elements. No text, no labels, no numbers, no letters."

2. **Always end with "No text"**: Every prompt must include "No text, no labels, no numbers, no letters anywhere in the image."

3. **Specify exact style**: Reference the color palette, line style, and visual mood from the source image. Example: "Dark technical blueprint style with navy background (#061426), cyan (#31D7FF) glowing lines, subtle grid pattern."

4. **Specify aspect ratio**: Match the aspect ratio of the target bounding box. "Aspect ratio approximately 16:9" or "Aspect ratio approximately 1:1".

5. **Specify transparency when needed**: "Transparent background (PNG with alpha channel)" for overlay elements. "Solid dark background" for background scenes.

6. **High quality by default**: Use `crs-image gen --quality high` for final PNG assets. Choose the output size to match or exceed the target bbox resolution, usually 1024px or larger on the longest side for icons and larger for backgrounds.

7. **One element per image by default**: Don't combine unrelated visual elements in the final PPT asset. Exception: generate same-style icon sheets or controlled asset sheets when you will crop them into separate final PNGs before placing them in the PPT.

8. **No source-icon cropping**: Do not crop icons from the original slide screenshot for final use. For ordinary semantic icons, generate a fresh CRS Image replacement and place it at the same bbox. Source cropping is reserved only for identity-critical elements that cannot be semantically replaced, such as logos, official seals, QR codes, certification marks, and exact data figures.

9. **Reuse `style_lock`**: When generating multiple related icons, include the exact same `style_lock` sentence in every prompt, then append the specific icon concept.

10. **Constrain large asset regions**: For backgrounds and complex decorative regions, include the `source_region_constraints` from the layout map directly in the CRS prompt.

11. **Icon prompt template**: For ordinary semantic icons, use a prompt structure like:

> Minimal corporate monoline icon of [specific concept], [style_lock sentence], similar visual density to the source icon. No text, no labels, no numbers, no letters anywhere in the image.

#### Asset Naming Convention

```
s{slide_number}_{semantic_role}.png
```

Examples:
- `s01_radar_network_scene.png` — cover slide's main radar illustration
- `s01_bottom_wave_decoration.png` — cover slide's bottom decorative wave
- `s03_system_diagram_center.png` — slide 3's central system model illustration
- `s05_rmse_chart_figure.png` — slide 5's RMSE result plot (if preserved as figure)

### Phase 3: PPT Construction

Use the **`$slides` system skill** or the **`presentation-skill`** (both based on PptxGenJS) to build the deck. If a presentation skill is installed, prefer it. Do NOT write raw python-pptx code — use whichever PptxGenJS-based skill is available, which provides bundled helpers, rendering, and validation.

Follow this exact layer stacking order for every slide (add elements in this sequence so z-order is correct):

```
Z-order (bottom to top):
1. Slide background color (set via slide.background)
2. Full-width structural bars (header band, footer band)
3. Large visual assets (background scenes, decorative motifs)
4. Panel/card frame shapes (rounded rectangles, boxes)
5. Smaller visual assets (icons, figures inside panels)
6. Lines, arrows, connectors
7. Native charts and tables
8. All text boxes (titles, labels, body text, captions)
9. Brand elements (logo on top)
```

#### Coordinate Conversion

Source images are typically at a known pixel resolution (e.g., 1920×1080 or 1672×941). Convert to PowerPoint inches using:

```javascript
const SLIDE_W = 13.333; // inches (16:9)
const SLIDE_H = 7.5;

function pxToInches(px_x, px_y, img_w, img_h) {
  return { x: px_x / img_w * SLIDE_W, y: px_y / img_h * SLIDE_H };
}
```

Measure element positions from the source image precisely. Don't guess.

#### PowerPoint-safe line coordinates

When adding PptxGenJS line shapes, never pass negative `w` or `h`. A connector drawn from right-to-left or bottom-to-top can produce negative dimensions if written as `w: x2 - x1, h: y2 - y1`; PowerPoint may fail to open the generated `.pptx` with a generic error.

Use a helper that normalizes coordinates:

```javascript
function addSafeLine(slide, x1, y1, x2, y2, line) {
  slide.addShape(pptx.ShapeType.line, {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
    line,
  });
}
```

Apply the same rule to all connectors, guide lines, decorative diagonals, and arrows implemented as line shapes.

#### Reusable construction helpers

For one-slide reconstructions with repeated visual patterns, define helper functions before adding elements. Useful helpers include:

- `addCard` for rounded card background, shadow, heading, and body text
- `addIconBadge` for outer circle, shadow, generated icon, and optional number badge
- `addFooterFlow` for bottom process bars with icon, label, arrow, and description
- `addOrbitNode` for center diagrams with connector dot, circular badge, icon, and label/card
- `addSafeLine` for all connectors

Helpers should consume layout-map bboxes. They should not hide placement values inside vague styling constants.

#### Font Handling

- Use "Microsoft YaHei" for Chinese text
- Use "Cambria Math" for mathematical formulas
- Match font size, weight (bold), and color from the source image
- Default to these approximations if unsure:
  - Main title: 28-32pt bold
  - Section title: 20-24pt bold
  - Card heading: 14-16pt bold
  - Body text: 10-12pt regular
  - Caption/label: 8-10pt regular
  - Page number: 10-12pt

#### Color Extraction

Extract exact colors from the source image. Provide hex values. Build a color palette object at the top of the script:

```javascript
const COLORS = {
  bg_dark: "0A1628",
  accent_cyan: "31D7FF",
  accent_gold: "C59A4A",
  text_white: "F2FBFF",
  text_muted: "A9C6D8",
  // ... etc
};
```

#### Rendering and Validation

After building each slide (or the full deck), use the `$slides` built-in render and validation scripts to:
- Render each slide to PNG for visual comparison
- Check for text overflow
- Check for element overlap issues
- Check for font substitution problems

Build one slide at a time. For each slide, use layered validation:

1. **Fast structural pass**: inspect PPTX/XML/object counts and extracted native text before full visual rendering.
2. **First visual pass**: render the assembled slide once after major assets and layout are in place.
3. **Targeted fix pass**: make grouped layout/asset fixes, then re-render.
4. **Final pass**: export the final preview only when the slide is close to complete.

Do not run expensive PowerPoint render/export after every tiny coordinate or style edit. Render after meaningful batches of changes. Fix any significant layout differences before moving on.

Required first-pass comparison checklist:

- Are the main regions in the same places as the source?
- Are title, subtitle, cards, central diagram, right media area, and footer close to the source proportions?
- Did any CRS Image asset introduce a new dominant shape that was not in the source?
- Did any generated background move source-dominant regions such as robots, architecture, screens, or light trails away from their original zones?
- Do complex rings, halos, and center decorations look polished enough, or should they become no-text PNG assets instead of native shapes?
- Did measured bboxes, placement bboxes, and asset bboxes drift from the layout contract?
- Are icon colors readable against their containers?
- Do icon groups share the same `style_lock` in stroke weight, fill treatment, visual density, and color?
- Did semantic replacement change the slide into a new template rather than reconstructing the source?

Always complete at least one fix-and-render loop after the first rendered preview. The first render is a draft, not the final.

If the first render shows icon artifacts, do not patch around them by shrinking or hiding the icon. Return to asset QA: inspect the PNG, clean transparency/background, regenerate the individual icon if needed, then rebuild.

### Phase 4: Validation

After building the PPTX:

1. **Structural check**: Count objects per slide. Each slide should have:
   - Multiple text frames (not zero)
   - Multiple shapes (not just one big picture)
   - If one picture covers >85% of slide area, confirm it is a regenerated no-text background asset, not the original full-slide screenshot
   - All readable text must be separate PPT-native text frames above that background

2. **Visual comparison**: If possible, render the PPTX to images and compare with source. Flag any slide where:
   - Major elements are missing
   - Layout is significantly different
   - Text is baked into images instead of text boxes
   - CRS Image assets change the original composition rather than filling the original visual regions
   - icon colors or background details reduce contrast or readability

3. **Editability check**: Verify that opening the PPTX and clicking on text allows editing.

4. **Source-image exclusion check**: Unpack or inspect the PPTX and confirm the original full-slide screenshot is not embedded as a slide-sized image. If a large image covers most of the slide, document that it is a regenerated no-text background asset.

5. **Text XML check**: Extract slide XML or use a PPTX text extractor and confirm all readable source text appears as native text. Missing text means the reconstruction is not complete.

6. **Overlay text conflict check**: For every region where editable PPT text sits over a photo, illustration, or preserved visual asset, verify that the underlying asset does not still contain the same readable source text. Reject slides with doubled text, ghosted text, partially masked text, or visible residual letterforms beneath the editable layer.

7. **Asset inventory check**: Confirm semantic icons are separate image assets with names/roles matching the layout map, not fragments cropped from the source screenshot or an uncontrolled sheet.

8. **Region and bbox contract check**: Confirm generated backgrounds preserve source-region constraints, complex decorative assets are placed inside their measured bboxes, and `measured_bbox_px`, `placement_bbox_px`, and `asset_bbox_px` differences are intentional.

9. **Speed audit**: Confirm the workflow did not waste time on avoidable loops: no full background regeneration for minor conflicts, no sequential generation after sample gate when parallel generation was safe, no repeated full renders for tiny edits, and repeated PPT components use helpers.

10. **Micro cluster fidelity check**: If a slide contains a compact platform/channel/brand entry region, verify that the output preserves the source cluster's item count, relative spacing, title-to-row proportion, icon recognition, and label placement. Reject reconstructions that turn the cluster into generic same-shape badges, initials, or placeholder symbols.

## Non-Negotiable Rules

1. **NEVER** use a full-slide screenshot as the background
2. **NEVER** bake readable text into generated images
3. **NEVER** use a single generic visual motif across many slides when the source slides have distinct visuals
4. **NEVER** merge unrelated elements (text + visual + shapes) into one image
5. **NEVER** skip the analysis phase — inspect every source image before writing any code
6. **NEVER** use crude PPT shapes to approximate complex illustrations when `@crs image` can generate a proper high-resolution visual
7. **NEVER** crop ordinary icons from the source screenshot for final PPT use; generate semantic CRS Image replacements and keep the original bbox.
8. **NEVER** use icon sheets as the default icon workflow. Generate one semantic icon per file unless a verified sheet is explicitly justified.
9. **NEVER** downgrade a platform/channel/brand entry cluster into generic same-shape badges, initials, or placeholder symbols unless the source cluster already uses that exact abstraction.
10. **ALWAYS** distinguish measured, placement, and asset bboxes for complex or nested elements.
11. **ALWAYS** create and reuse an icon `style_lock` when generating related icon groups.
12. **ALWAYS** prefer a no-text PNG asset for complex decorative rings, technology halos, and dense center diagrams when native PPT shapes look crude.
13. **ALWAYS** generate each visual asset without any text
14. **ALWAYS** match the source image's color palette, not a generic theme
15. **ALWAYS** place text as PPT-native text boxes, even if it overlaps a visual asset
16. **ALWAYS** ensure any underlying asset is text-free before placing PPT-native editable text over it.
17. **ALWAYS** process slides one at a time — each slide gets its own analysis, assets, and build function
18. **ALWAYS** distinguish a regenerated no-text background asset from the original full-slide screenshot: regenerated backgrounds are allowed; screenshot backgrounds are not.
19. **ALWAYS** QA generated icons for transparency, bbox centering, no text, color, and final-size legibility before inserting them into the PPT.
20. **ALWAYS** use sample-gated parallel asset generation when there are multiple independent icons/assets and the tool can handle it safely.
21. **ALWAYS** prefer layered validation: quick XML/structure checks first, full render/export for assembled previews and final verification.
22. **ALWAYS** split compact platform/channel/brand entry regions into container structure, editable labels, and per-icon assets rather than treating the whole region as either a flat screenshot or a fully abstract redrawing.

## Common Failure Modes to Avoid

### Failure: "New template" instead of "reconstruction"
**Symptom**: The output looks like a professional PPT on the same topic, but doesn't match the source image's specific layout.
**Cause**: Skipping detailed analysis, using generic layouts.
**Fix**: Measure exact positions from the source image. Match the source's specific element arrangement.

### Failure: "Semantic drift"
**Symptom**: Generated backgrounds or icons are attractive, but the slide no longer feels like the source: new large rings, panels, foreground scenes, or visual hierarchy appear.
**Cause**: CRS Image prompts were based on topic/style but not constrained by the source layout map.
**Fix**: Regenerate assets with strict negative constraints and place them only inside measured source-aligned bboxes. For backgrounds, forbid big circles, diagrams, cards, UI panels, text blocks, and foreground objects in content areas.

### Failure: "Correct icon, wrong contrast"
**Symptom**: The icon meaning is correct but the icon is hard to see, such as blue icons placed on blue circular badges.
**Cause**: Reusing generated icon colors without adapting them to the container.
**Fix**: Recolor icon assets or generate container-specific variants. Blue badges usually require white icons; white cards can use navy icons.

### Failure: "Dirty cropped icons"
**Symptom**: Small icons look blurry, pixelated, jagged, or have dirty screenshot edges.
**Cause**: Cropping icons from the source screenshot instead of regenerating them.
**Fix**: Treat source icons as semantic references only. Generate clean high-resolution replacements with `@crs image`, then place each replacement at the same measured bbox and size.

### Failure: "Broken icon sheet crops"
**Symptom**: Icons appear as partial shapes, half-icons, empty regions, or mismatched concepts after cropping.
**Cause**: Assuming a generated icon sheet has exact cell boundaries or using sheet generation to rush many icons.
**Fix**: Regenerate each icon as an individual transparent PNG. Use the source layout map for placement and keep each output file tied to one semantic role.

### Failure: "Fake transparency"
**Symptom**: Icons show checkerboard, pale squares, white halos, or gray boxes in the PPT render.
**Cause**: The generated PNG contains a baked transparency-preview background or near-white matte instead of real alpha.
**Fix**: Inspect the PNG before insertion. Remove checkerboard/near-white background with image processing or regenerate with a stronger transparent-background prompt. Re-render at final size before proceeding.

### Failure: "Icon style drift"
**Symptom**: Icons have correct meanings but differ in stroke weight, fill ratio, line endings, perspective, badge style, or visual density.
**Cause**: Each icon prompt was written independently without a shared style lock.
**Fix**: Define one `style_lock`, regenerate a sample, then regenerate the icon group with the same style sentence reused verbatim.

### Failure: "Platform/channel/brand cluster collapse"
**Symptom**: A compact platform/channel/brand entry area in the source becomes a row of generic same-shape badges, initials, or placeholder symbols in the output.
**Cause**: The region was treated as a generic functional icon row instead of a high-semantic-density recognition cluster.
**Fix**: Reclassify the region as a micro platform/channel/brand entry cluster. Keep the container and labels native, but rebuild each icon independently with source-aligned spacing and stronger recognition fidelity requirements.

### Failure: "Overlay text ghosting"
**Symptom**: Editable PPT text is correct, but the same words remain faintly visible underneath because the preserved or cropped visual asset still contains source text.
**Cause**: A text-bearing screenshot or photo region was reused as a visual asset beneath editable text, or masking removed only part of the original words.
**Fix**: Replace the underlying region with a no-text regenerated asset, or fully remove the source text before overlaying editable text. Do not rely on partial masking when residual letterforms remain visible.

### Failure: "Background region drift"
**Symptom**: Robots, screens, architecture, light trails, or other source-dominant regions move to new positions and compete with cards or text.
**Cause**: The background prompt captured theme but not source-region constraints.
**Fix**: Add explicit region constraints from the layout map and regenerate. Keep title/card regions low-contrast and empty.

### Failure: "Over-native center diagrams"
**Symptom**: Center rings, technology halos, orbit diagrams, or complex frames look flat, crude, or mechanically drawn compared with the source.
**Cause**: Complex decorative linework was forced into PPT-native shapes.
**Fix**: Generate a no-text transparent PNG for the complex decorative layer, place it inside the measured bbox, and overlay all readable text as native PPT text.

### Failure: "Slow serial workflow"
**Symptom**: One screenshot takes much longer than expected even though individual image generation is fast.
**Cause**: All icons/assets are generated sequentially, coordinates are hand-estimated from zero, full render/export is repeated after tiny edits, or helper functions are not used for repeated PPT components.
**Fix**: Draft the layout map with OCR/edge/color-assisted measurement, use sample-gated parallel asset generation, batch layout fixes between renders, and build repeated cards/badges/process bars with helpers.

### Failure: "Generic motif spam"
**Symptom**: The same background image appears on every slide.
**Cause**: Generating one or few generic background images and reusing them.
**Fix**: Each slide's visual assets should be unique and match that specific slide's source image content.

### Failure: "Over-native crude shapes"
**Symptom**: Complex illustrations (radar dishes, waveforms, network diagrams) rendered as ugly PPT shape approximations.
**Cause**: Trying to rebuild everything with native shapes when CRS Image would produce a much better result.
**Fix**: Use `@crs image` for any visual element that PPT shapes can't faithfully reproduce.

### Failure: "Baked text"
**Symptom**: Text visible in the PPTX but not editable — it's part of an image.
**Cause**: Generated images include text that should be editable.
**Fix**: CRS Image prompts must always specify "No text, no labels, no numbers, no letters anywhere in the image"; add all readable text as PPT-native text boxes.

### Failure: "PowerPoint cannot open generated file"
**Symptom**: PptxGenJS writes a `.pptx`, but PowerPoint or PowerPoint COM fails to open it with a generic `E_FAIL` or repair prompt.
**Cause**: A line shape has negative `w` or `h`, often from diagonal connectors created with `w: x2 - x1` and `h: y2 - y1`.
**Fix**: Normalize all line coordinates with `min(x1,x2)`, `min(y1,y2)`, `abs(x2-x1)`, and `abs(y2-y1)` before writing the shape.
