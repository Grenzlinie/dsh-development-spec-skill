# Agent Note: Publish Project Interpretation

Status: implemented

## Problem

仓库已经交付 `spec-driven-development` Skill、DeepSeek Harness 案例研究和三组配对实验，但缺少一份适合公开阅读、可打印分享的中文解读，也没有面向学生和程序员的小红书图文版本。现有证据分散在案例研究、实验报告、scorecard 与截图中，读者需要自己拼出项目动机、框架来源和实验效果。

## Decision

仓库新增 `docs/interpretation.md` 作为公开长文，覆盖项目动机、Skill 框架、DeepSeek Harness 的文档分工、三组实操检验、结果计算和适用边界。`docs/interpretation/spec-driven-development-interpretation.tex` 使用 `paper-jiedu-latex` 的 `ctexart`、Fandol、keybox、页眉页脚和图块约束，产出 8 页 PDF。PDF 嵌入两张冻结数据图、两组共四张真实移动端截图，并展开 22.17 分和 first-pass failure 均值的计算。

`docs/xiaohongshu/` 保存面向学生与程序员的标题、正文、标签建议、可编辑 `cards.html` 和七张 1080×1440 PNG。封面底图由内置 `imagegen` 生成，不含文字；所有标题、数字、项目名和页码由 HTML/CSS 排版。联系表完成移动缩略图检查，素材 prompt 与来源记录在 `assets/SOURCES.md`。

通过 GitHub 插件检索并读取四类公开实现。`white0dew/XiaohongshuSkills` 提供 CDP 发布与数据抓取，`Xiangyu-CAS/xiaohongshu-ops-skill` 管理账号到复盘的运营过程，`vivy-yi/xiaohongshu-skills` 将标题与封面拆成小 Skill，`op7418/guizang-social-card-skill` 提供 3:4 社交卡、证据截图和渲染 QA。调研固定 commit 链接并记录适用边界，没有安装第三方代码，也没有执行小红书登录或发布。

根 README 增加长文、PDF、小红书素材和 GitHub 调研入口。`scripts/verify_publication.py` 从冻结 `unblinded-summary.json` 复核均值，检查图表数字、PDF magic 与体积、七张卡片及 1080×1440 尺寸；该命令已进入仓库 `specctl verify` 配置。

用户于 2026-08-14 明确批准图文解读、小红书素材和 GitHub 更新。本次发布使用独立分支 `codex/publish-spec-driven-guide`，不自动对外发布小红书。

## Alternatives considered

**只上传 Markdown。** 方便代码审查，但不能满足可打印分享和图文解读需求，因此保留 Markdown 作为事实源，同时生成 PDF。

**把所有文字交给图像模型生成。** 中文文字和数值容易失真，无法稳定复核，因此生成式图像只提供无文字视觉底图，正文与数据由 LaTeX 或 HTML/CSS 排版。

**直接使用搜索到的小红书发布脚本。** 自动发布涉及账号登录、Cookie、平台风控和不可逆外部动作，本次只整理宣传素材并更新 GitHub，不代替用户发布小红书。

## Verification

- `human-writing/scripts/check_prose.py` 检查长文和小红书文案，翻案句、同构排比、名词化、黑话、硬停词、模型路标与禁用抒情词均为 0；小红书短稿只有句长变异提醒，经人工复核保留。
- XeLaTeX 连跑两遍成功，最终 PDF 为 A4、8 页、约 2.7MB。Homebrew `pdftoppm` 逐页渲染并完成联系表检查；工作区 runtime 的另一份 `pdftoppm` 因缺少 Adobe-GB1 mapping 被排除。
- 七张小红书卡片由 headless Chrome 渲染，尺寸均为 1080×1440；联系表确认标题、关键数字、页码和正文没有溢出。
- `python3 scripts/verify_publication.py` 返回 `Publication data, charts, PDF, and seven 1080x1440 cards pass.`。
- `python3 /Users/siyuliu/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/spec-driven-development` 返回 `Skill is valid!`。
- `python3 .codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note` 返回 `pass: true`，其中 12 个 unittest、Markdown links、experiment integrity 与 publication artifacts 全部通过。

## Consequences

读者现在可以从一篇自然中文长文进入项目，也可以下载带公式、图表和原始截图的 PDF。学生和程序员可以直接预览七张小红书卡片，按配套文案人工发布。所有关键数字继续由冻结实验数据约束，PDF 与 PNG 也保留可编辑源文件和验证命令。

交付增加约 2.7MB PDF、七张 3:4 PNG、封面生成图和三份图表的二进制体积。三组 paired case 仍只是一组示范性比较，文章与卡片都保留该边界。小红书自动发布、账号登录、Cookie 管理和发布后数据复盘没有执行。
