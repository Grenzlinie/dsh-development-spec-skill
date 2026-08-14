# 架构

本仓库交付的是一套独立的 Agent 开发控制层，不替代应用框架，也不要求特定编程语言。它把产品意图、实现活动和验收证据连接为一条可检查的链：

`idea → approved decisions → Agent Note → code/tests/docs → verification evidence → implemented decision`

## 组成

| 组件 | 权威范围 |
|---|---|
| `AGENTS.md` | 每次 Agent 工作都必须看到的仓库级指令和边界。 |
| `.codex/skills/spec-driven-development/` | 可复用工作流、决策分工、Note 格式、验证方法和 `specctl.py`。 |
| `.agents/notes/` | 非平凡变更的理由、备选方案、批准、验收和当前决策。 |
| `docs/` | 当前架构、开发过程、测试边界、案例研究和采用指南。 |
| `tests/` | Skill helper 的确定性行为和仓库治理契约。 |
| `playground/` | 三组配对实验的 prompts、源码、隐藏验收、盲评和报告。 |

## 控制流

人类输入 idea 后，Agent 先检查仓库，再把 idea 整理成 Problem、Goals、Non-goals 和 Acceptance criteria。人类只批准产品层决定。批准后，Agent 分片实现并执行与验收标准一一对应的检查。Review 同时比较 diff 与已批准 Note，不能只看测试是否为绿。最后，Agent 把 proposed Note 改写成描述已交付事实的 implemented Note。

如果实现过程中改变了产品含义，控制流退回 `APPROVE`。如果只是可逆的内部技术选择，Agent 更新记录并继续。这条边界避免人类被普通实现细节拖住，也避免 Agent 擅自改变产品。

## 状态模型

Agent Note 支持 `proposed`、`implemented`、`rejected` 和 `archived`。`proposed` 可以进入 `implemented` 或 `rejected`；只有 `implemented` 可以进入 `archived`。迁移前必须先完成语义改写，`specctl transition` 只校验并移动文件，不会替 Agent 声称“已经实现”。

## 机械检查与语义判断

`specctl.py` 使用 Python 标准库，负责文件存在性、路径安全、Note 结构、状态迁移、配置解析和命令执行。它不根据文件名自动判断一次 diff 是否“非平凡”，因为语义影响不能由路径可靠推断。工作 Agent 做出判断后，对非平凡变更显式传入 `verify --require-note`。

## 扩展点

项目在 `.agents/spec-driven-development.json` 中登记验证命令。语言、框架、部署和质量工具留在具体项目中；Skill 只规定它们必须对应验收标准、保留真实结果，并在能力未执行时明确写出边界。
