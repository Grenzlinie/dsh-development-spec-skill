# Agent Note: Spec Driven Development Framework

Status: implemented

## Problem

通用 coding agent 可以从简短 idea 直接产出代码，但产品意图、验收含义、技术选择和完成证据容易散落在对话中。新项目需要一套独立、可移植的控制层，让人类只处理产品决定，同时让 Agent 的实现、验收和长期文档保持一致。

## Decision

本仓库交付独立的 `spec-driven-development` Skill，并使用 `DISCOVER → FRAME → SPECIFY → APPROVE → IMPLEMENT → VERIFY → REVIEW → RECORD`。人类批准 Problem、Goals、Non-goals、Acceptance criteria 以及高成本或不可逆选择；Agent 自主处理可逆工程决策。非平凡变更在生产代码之前建立 proposed Agent Note，完成后经语义改写和机械校验进入 implemented。

Skill 位于 `.codex/skills/spec-driven-development/`，包含渐进加载 references、bootstrap assets 和 Python 标准库 `specctl.py`。CLI 默认 preview，显式 `--apply` 才写入；它拒绝覆盖、校验 Note skeleton、限制路径、执行合法迁移并运行项目配置。是否属于非平凡变更由 Agent 进行语义判断，`verify --require-note` 只在该判断之后显式使用。

本仓库同时保留 DeepSeek Harness 案例研究、新项目采用指南，以及 React/TypeScript、FastAPI/SQLite 和 Canvas/TypeScript 三组 paired experiments。Oracle 和匿名 condition map 在 builder 开始前锁定并记录 SHA-256；同一 product-owner simulator 只回答产品问题；每个 candidate 有一次统一 repair；blind evaluator 先冻结 70 分产品 score，再读取过程 artifacts 评 30 分，最后才解盲。

实验最终保留六套 source、locks、tests、prompts、问答审计、first/hidden/final evidence、10 张截图、命令结果、product/blind scorecards 和 unblinded summary。依赖、虚拟环境、构建、cache、coverage、运行数据库和浏览器 profile 不进入交付。

## Alternatives considered

**只写一份方法论文章。** 它不能稳定约束 Agent，也不能机械验证 Note 迁移、文件完整性和项目命令，因此不采用。

**直接复用现有 project governance Skill。** 现有能力与目标有交集，但用户选择独立、自包含框架，以便单仓库复制和实验隔离，因此不集成。

**自动判断每个 diff 是否需要 Agent Note。** 文件路径不足以判断行为和契约影响，自动分类容易产生错误的安全感，因此由 Agent 做语义判断并显式使用 `--require-note`。

**只比较最终 tests 是否通过。** 六套 final tests 全绿仍未阻止三个 baseline 出现移动信息丢失、API 终态语义和游戏目标偏移；因此保留独立 product review、过程 review 和 first-pass 缺口。

## Verification

- 官方 `quick_validate.py` 验证 Skill metadata 和目录结构。
- `python3 -m unittest discover -s tests -v` 的 12 个测试覆盖 CLI preview/apply、拒绝覆盖、路径限制、Note 格式、迁移、bootstrap 幂等性和临时 Git 仓库 verify。
- `python3 scripts/check_markdown_links.py .` 验证本地 Markdown targets。
- `python3 scripts/verify_experiment.py` 验证 oracle 与 condition hash、六套候选 artifacts、evidence JSON、盲评分算术、截图、解盲均值和禁留物。
- Blind evaluator 从锁文件 fresh install 六套项目；Runboard tests 为 8/9，Seat tests 为 13/10，Signal tests 为 10/16，全部通过；四个 Web production build 和两个 Python package build 全部通过。
- 四个 Web candidate 在 1440×900 与 390×844 完成真实浏览器检查并保留 10 张截图。受控 localhost permission 解决初次 `listen EPERM`；Python 网络 permission 解决初次依赖下载阻塞。
- 根 `specctl verify --root . --require-note` 执行全部配置检查。

## Consequences

新项目可以复制一个自包含 Skill 和最小治理目录，把 product approval、Agent 实现与实际 verification 连接起来。三组 treatment 的平均产品分为 68.50/70、过程分为 29.67/30、总分为 98.17/100；baseline 分别为 61.83、14.17 和 76.00。Treatment 在 first pass 平均有 0.33 个 acceptance failure，baseline 为 4.00 个。

这套流程会增加 proposal、批准和 current documentation 成本，因此机械/local 修改豁免完整 lifecycle。三对实验只是一组可审查 case study，不能外推为普遍因果估计。Browser blur、screen reader、生产部署和外部服务等未实际执行的能力保持显式边界；治理 PASS 也不替代产品和科学或业务正确性。
