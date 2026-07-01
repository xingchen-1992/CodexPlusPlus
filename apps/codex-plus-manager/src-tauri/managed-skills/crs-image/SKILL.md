---
name: crs-image
description: Use this skill when the user asks to generate, create, render, or edit bitmap images through the CRS relay image service. Prefer the local crs-image command over OpenAI platform keys, web pages, or changing the Codex model.
---

# CRS Image

Use `crs-image` for image generation and image edits. It calls the CRS relay Images API and saves image files into the current project. The CLI sends `model: gpt-image-2`; the CRS relay may route 2K/4K presets through the Codex image web backend to preserve the requested size. Pass the user's visual prompt through as literally as possible.

## Workflow

1. Check availability:

```bash
crs-image doctor --json
```

If this fails because configuration is missing, tell the user to run the CRS/Codex one-click config first so `~/.codex/auth.json` contains `OPENAI_API_KEY`.

If the user explicitly wants to override the one-click config, use:

```bash
crs-image config --base-url https://RELAY_DOMAIN/openai/v1 --api-key CRS_API_KEY
```

Do not ask for `OPENAI_API_KEY` during normal use. The command should reuse `~/.codex/auth.json`.

2. Generate a new image:

```bash
crs-image gen "prompt text" -o generated/image.png --json
```

If the user already specified a clear size, map it to `--size` before calling the tool. Supported user-facing presets are `1:1`, `16:9`, `9:16`, `2:3`, `3:2`, `3:4`, and `4:3`, each with `1K`, `2K`, and `4K` tiers. Custom sizes must be passed as `WIDTHxHEIGHT`.

If the user did not specify size in the current image request, ask once with this exact prompt before running `crs-image`:

```text
生成前请先选择图片规格，系统默认使用「高质量」生成。
下面的“适合场景”只是参考，不会自动替你决定规格，请你自己选择。

可选规格：

1. 方图 `1:1`
   适合头像、Logo、表情包、商品主图、社交平台方形配图
   `1K 1024x1024` / `2K 2048x2048` / `4K 2880x2880`

2. 横图 `16:9`
   适合 PPT、视频封面、电脑壁纸、横版海报、网页横幅
   `1K 1824x1024` / `2K 2048x1152` / `4K 3840x2160`

3. 竖图 `9:16`
   适合手机壁纸、短视频封面、竖屏海报、朋友圈竖图
   `1K 1024x1824` / `2K 1152x2048` / `4K 2160x3840`

4. 竖版 `2:3`
   适合人物海报、商品海报、图文封面、电商详情首图
   `1K 1024x1536` / `2K 1344x2016` / `4K 2336x3504`

5. 横版 `3:2`
   适合横版插画、宣传图、摄影感画面、宽幅展示图
   `1K 1536x1024` / `2K 2016x1344` / `4K 3504x2336`

6. 竖版 `3:4`
   适合人物半身图、竖版插画、杂志封面、内容封面
   `1K 1024x1360` / `2K 1536x2048` / `4K 2496x3312`

7. 横版 `4:3`
   适合横版插画、演示配图、传统屏幕比例、产品展示图
   `1K 1360x1024` / `2K 2048x1536` / `4K 3312x2496`

回复格式：`画幅 清晰度`，例如 `16:9 2K`。
如果要自定义尺寸，回复：`自定义 宽x高`，例如 `自定义 1280x720`。
```

Do not ask again in the same conversation if the user has already chosen an image size for this image task flow. Reuse that size until the user changes it. Do not infer size from words such as PPT, poster, cover, avatar, wallpaper, or banner when the user has not chosen a size; ask with the prompt above.

Quality defaults to high quality. Map the final choice to flags:

```bash
crs-image gen --prompt "prompt text" --size "16:9 2K" --quality high -o generated/image.png --json
```

Use `--quality high` by default. If the user explicitly says low/cheap/fast, use `low`; medium/standard, use `medium`; high/best/max/xhigh/highest, use `high`. Codex reasoning effort such as xhigh is not the image quality setting.

Billing behavior:

- Each successful image generation/edit is recorded in the CRS user console, including image mode, model, size, quality, and USD cost. 1K requests are normally recorded as `gpt-image-2`; 2K/4K preset requests may be recorded as `codex-gpt-image-2`.
- Failed requests that return an error before image data is produced are not successful image usage records.
- Image cost is recorded after the upstream returns image data. If a user is very close to a daily or total USD limit, the final successful image can push usage over the limit by roughly one image job. Do not request multiple images or high/large outputs unless the user asked for them.

For long prompts, multiline prompts, quotes, or shell-sensitive text, use stdin or a prompt file:

```bash
printf '%s' "prompt text" | crs-image gen -o generated/image.png --json
crs-image gen --prompt-file prompt.txt -o generated/image.png --json
```

3. Edit an existing image:

```bash
crs-image edit input.png --prompt "edit instruction" -o generated/edit.png --json
```

For masks:

```bash
crs-image edit input.png --mask mask.png --prompt "edit instruction" -o generated/edit.png --json
```

## Rules

- Use the user's requested output path when provided; otherwise save under `generated/`.
- Preserve the user's prompt text. Do not summarize, simplify, translate, or replace details unless the user explicitly asks you to improve the prompt.
- Preserve important user details such as style, subject, colors, dimensions, text, layout, camera angle, and constraints.
- Use `-n 1` unless the user explicitly asks for multiple images.
- Use `--prompt-file` or stdin for long, multiline, quoted, or shell-sensitive prompts so the user's text is not corrupted by shell quoting.
- Report the generated file path back to the user.
- Do not use `/model gpt-image-2`; Codex model selection is for reasoning models, not this image tool.
- Do not call `api.openai.com`; this skill is for the configured CRS relay endpoint.
