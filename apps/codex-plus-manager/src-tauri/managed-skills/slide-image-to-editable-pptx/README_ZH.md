<div align="center">

# Slide Image → Editable PPTX

### 高保真还原：将 PPT 幻灯片截图转换为可编辑的 PowerPoint 文件

[![Skill](https://img.shields.io/badge/type-Codex%20Skill-blue.svg)](https://developers.openai.com/codex/skills)
[![Platform](https://img.shields.io/badge/platform-Codex%20%7C%20Claude%20Code-lightgrey.svg)](#兼容性)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PptxGenJS](https://img.shields.io/badge/built%20with-PptxGenJS-orange.svg)](https://github.com/gitbrent/PptxGenJS)

**把 PPT 截图变回可编辑的 PowerPoint 文件。**

文字保持可编辑，复杂视觉元素和普通语义图标使用 @crs image 生成高清干净 PNG，简单形状变成原生 PPT 对象。

[English](README.md) | 中文

</div>

---

## 痛点

你手上有一组 PPT 幻灯片的图片（截图、导出的 PNG、或 AI 生成的样式稿），你希望把它们还原成一个**可编辑**的 `.pptx` 文件——而不是把截图贴进去当背景。

现有方案的问题：

| 方案 | 结果 |
|------|------|
| 截图贴背景 | 完全不可编辑 |
| 让 AI"重新做一份" | 主题对了但布局全错——是全新的模板，不是还原 |
| 人工手动重做 | 每页要花几十分钟 |

## 解决方案

这个 Skill 教会 Codex（或其他兼容的 AI 编码代理）将每张幻灯片图片**分解为三层**，然后重新组装成真正的 PowerPoint 文件：

| 层级 | 包含内容 | 实现方式 | 可编辑？ |
|------|---------|---------|---------|
| **A — 视觉资产** | 复杂插图、照片、科学图表、普通语义图标、装饰性背景 | @crs image 生成高清 PNG（本地 `crs-image` 命令）——不含任何文字；普通图标不从原图裁切 | 可替换 |
| **B — 结构** | 矩形、卡片、面板、线条、箭头、分隔线、徽章 | PPT 原生形状 | 完全可编辑 |
| **C — 内容** | 所有可读文字：标题、标签、正文、页码、说明文字 | PPT 原生文本框 | 完全可编辑 |

## 工作原理

Skill 分三个阶段执行，每个阶段使用独立的上下文窗口以保证最佳质量：

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Phase 1        │     │   Phase 2        │     │   Phase 3        │
│   像素级分析      │────▶│   视觉资产生成    │────▶│   PPT 组装       │
│                  │     │                  │     │                  │
│  • 逐张检查源图   │     │  • 为每个 A 层   │     │  • 用原生形状和  │
│  • 分类每个元素   │     │    元素生成 PNG  │     │    文本框构建    │
│  • 标注位置和层级  │     │  • 图片中不含    │     │  • 渲染并与源图  │
│  • 自检遗漏元素   │     │    任何文字      │     │    对比验证      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 分类逻辑

分类逻辑是重建过程的核心：先把源图里的每个可见元素判断为视觉资产、PPT 原生结构，或可编辑文本，再进入后续重建。

<p align="center">
  <img src="assets/screenshots/10.jpg?v=20260607-1302" alt="分类逻辑预览" width="680">
</p>

### Phase 1：像素级分析

AI 代理逐张检查源图片，将每个可见元素编目，记录其类型、位置（边界框）、层级分类和实现方式。**完整性自检**（Step 1.4）确保不遗漏小图标、卡片内插图和装饰细节。

**产出**：`_analysis.md` —— 所有幻灯片的结构化元素清单。

### Phase 2：视觉资产生成

对每个 A 层元素，AI 代理使用 `@crs image` / 本地 `crs-image` 命令生成高清干净 PNG，精确指定内容、风格、配色、比例和透明度——并且每个 prompt 都以 **"No text, no labels, no numbers"** 结尾。普通图标只从源图识别语义、位置和大小，不从原图裁切；最终视觉资产默认使用 `--quality high`，逐张串行生成，确认文件落盘后再生成下一张。

**产出**：`assets/` 文件夹（所有生成的 PNG）+ `_phase2_assets.md` 报告。

下面这张图展示 Phase 2 的实际工作：把 Phase 1 标出的 A 层元素画成干净的视觉资产，再交给 Phase 3 组装。

![Phase 2 视觉资产生成过程](assets/screenshots/8和9合在一起.jpg)

### Phase 3：PPT 组装

AI 代理使用 `@presentations`（PptxGenJS）构建 PPTX，按正确的 z-order 叠放元素：背景色 → 视觉资产 → 结构形状 → 文本框 → 品牌元素。每 5 页为一批，每批完成后渲染截图并自验证。

**产出**：最终 `.pptx` 文件 + 渲染预览 + `validation_report.md`。

## 快速开始

### 安装

把 skill 文件夹复制到你的 Codex skills 目录：

```bash
# 克隆或下载
git clone https://github.com/YOUR_USERNAME/slide-image-to-editable-pptx.git

# 复制到 Codex skills 目录
cp -r slide-image-to-editable-pptx ~/.codex/skills/
```

或通过 CC Switch 安装：Skills 面板 → 从 GitHub 添加 → 粘贴仓库 URL。

### 使用方法

**推荐：三段式提示词**（效果最好，每个阶段都能用满完整上下文窗口）

**提示词 1** —— 分析：
```
请使用 $slide-image-to-editable-pptx skill，将文件夹中的 PPT 幻灯片图片转换为
一个可编辑的 PPTX 文件。要求视觉效果与原图尽量一致，所有文字可编辑，复杂视觉
元素和普通语义图标使用 @crs image 生成高清干净 PNG，不要从原图裁切普通图标。请严格按照 Phase 1 先完成分析，完成后执行 
Step 1.4 的自检——检查是否遗漏了小图标、卡片内插图、装饰细节等，输出每张图的
完整元素清单交我确认后，再进入 Phase 2。
```

**提示词 2** —— 生成资产：
```
进入 Phase 2，输出资料交我确认，我确定没问题之后再进入 Phase 3。
```

**提示词 3** —— 组装 PPT：
```
进入 Phase 3。请使用 @presentations 构建 PPTX。assets/ 中的 PNG 资产已准备好。
按照 _analysis.md 中的元素清单逐页构建，要贴着原图复刻，逐页按实际位置、尺寸
和密度去还原，先做 1-5 页，渲染截图给我确认后再继续 6-10、11-15……
```

### 文件结构

```
your-project/
├── source_slides/           # 你的源幻灯片图片
│   ├── slide_01.png
│   ├── slide_02.png
│   └── ...
├── assets/                  # 生成的 PNG 视觉资产（Phase 2 产出）
├── output/                  # 最终 PPTX 文件（Phase 3 产出）
├── _analysis.md             # 元素清单（Phase 1 产出）
├── _phase2_assets.md        # 资产生成报告（Phase 2 产出）
└── validation_report.md     # 质量报告（Phase 4 产出）
```

## 设计决策

### 为什么要分三个阶段？

AI 编码代理的上下文窗口有限（约 200K token）。一口气跑完意味着每个阶段只能用到三分之一的上下文。分三次执行，确保：

- **Phase 1** 用满上下文做彻底分析
- **Phase 2** 用满上下文做高质量生图
- **Phase 3** 用满上下文写精确的 PPT 代码

### 为什么不直接用整页截图当背景？

整页截图贴背景 = 零可编辑性。这个 Skill 的核心目的就是让文字可编辑、形状可调整，同时视觉外观不变。

### 为什么生成图片而不是从源图裁切？

从幻灯片截图裁切出来的小图片分辨率低、边缘不干净，尤其是小图标会显得模糊、毛边、风格不统一。正确做法是：根据源图识别图标含义、颜色、位置和大小，然后用 @crs image 生成同义高清图标替换，保持 bbox 一致。只有 logo、印章、二维码、认证标识、真实数据图这类身份敏感元素才需要保留或更精细追踪原始身份。

### 为什么不把所有东西都用 PPT 形状重建？

有些视觉元素（雷达场景、科学插图、校园线稿、装饰纹理等）太复杂，PPT 形状画不出来。硬画只会产生粗糙难看的近似效果。AI 生成的 PNG 能保持视觉保真度。

## 常见失败模式及 Skill 的应对

| 失败模式 | 症状 | 如何预防 |
|---------|------|---------|
| **全新模板** | 输出看起来是同主题的另一套 PPT | Phase 1 强制像素级位置测量 |
| **通用 motif 泛滥** | 每页都是相同的背景图 | 每页生成匹配其源图的独特资产 |
| **形状硬画** | 复杂视觉变成丑陋的 PPT 形状近似 | 分类规则将复杂视觉导向 `@crs image` |
| **文字烤进图片** | 文字可见但不可编辑 | 所有 CRS Image prompt 以"No text"结尾 |
| **原图裁小图标** | 图标模糊、毛边、低清晰度 | 只用原图判断语义和 bbox，用 @crs image 生成高清替换图标 |
| **遗漏元素** | 小图标或细节在输出中缺失 | Step 1.4 完整性自检捕捉遗漏 |

## 兼容性

| 平台 | 状态 | 说明 |
|------|------|------|
| OpenAI Codex | 完全支持 | 主要目标平台，使用 `@crs image` + `@presentations` |
| Claude Code | 兼容 | 需配合对应的生图和 PPTX skill 使用 |
| 其他 AI 代理 | 可适配 | 任何有生图 + PptxGenJS 能力的代理均可 |

## 效果展示

这些截图展示了这个 skill 适合处理的幻灯片图片重建流程：先对源图进行视觉拆解，再重建为可编辑的 PowerPoint 对象，并用渲染预览做对照检查。

### 重建效果画廊

#### 示例 1

![幻灯片重建预览 1](assets/screenshots/第一张.jpg)

#### 示例 2

| 图片版 | 可编辑版 |
| :---: | :---: |
| ![幻灯片图片版](assets/screenshots/第3张.jpg) | ![幻灯片可编辑版](assets/screenshots/第2张.jpg) |

#### 示例 3

| 图片版 | 可编辑版 |
| :---: | :---: |
| ![幻灯片图片版](assets/screenshots/第4张.jpg) | ![幻灯片可编辑版](assets/screenshots/第5张.jpg) |

## 贡献

欢迎提 Issue、建议和 PR！

如果你用这个 Skill 转换过幻灯片，想分享前后对比的案例，请开一个 PR——真实案例能帮助其他用户了解效果。

## License

MIT

## 致谢

- [PptxGenJS](https://github.com/gitbrent/PptxGenJS) — 让程序化创建 PPTX 成为可能的 JavaScript 库
- [OpenAI Codex](https://openai.com/codex/) — AI 编码代理平台
- [CC Switch](https://github.com/farion1231/cc-switch) — 项目文档结构的灵感来源
