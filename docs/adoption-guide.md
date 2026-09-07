# 新项目如何采用 Spec-Driven Development

这份指南面向只有 idea、尚未建立稳定开发流程的新项目。完成后，仓库会有一套 Agent 可执行的 instructions、决策记录、当前文档和验证命令；人类只需要批准产品含义与高成本选择。

## 1. 引入 Skill 并检查现状

把本仓库的 `.codex/skills/spec-driven-development/` 复制到目标仓库的同一路径，不要复制本仓库的 playground 结果。先预览目标仓库缺少什么：

```sh
python3 .codex/skills/spec-driven-development/scripts/specctl.py inspect --root .
python3 .codex/skills/spec-driven-development/scripts/specctl.py bootstrap --root .
```

如果目标仓库已有 `AGENTS.md`、architecture docs 或决策记录，不要创建平行版本。保留原文件，把本框架的职责、lifecycle 和验证入口合并到现有权威位置。只有确认 preview 中的新增项不会与现有制度冲突后，才执行：

```sh
python3 .codex/skills/spec-driven-development/scripts/specctl.py bootstrap --root . --apply
```

完成信号：`inspect` 报告 `ready: true`，`CLAUDE.md` 是指向 `AGENTS.md` 的相对 symlink；已有同名文件保持原内容，不被 bootstrap 覆盖。

## 2. 写清一次谁做什么决定

在 `AGENTS.md` 固定以下边界：

- 人类决定用户问题、目标、优先级、Non-goals、验收含义、政策、预算、不可逆迁移和重大运行成本。
- Agent 决定内部模块、命名、可替换依赖、测试组织和实现顺序。
- 技术选择一旦改变产品行为、安全、数据所有权、兼容性或持续运维成本，就回到人类批准。

不要要求人类审批每个文件和函数；这会把 idea owner 重新拉回工程微管理。也不要让 Agent 把“技术上容易”当作产品批准。

完成信号：任何参与者都能从 `AGENTS.md` 判断一个具体问题应由谁回答，且只有一个权威答案。

## 3. 把 idea 变成可批准 proposal

Agent 先做只读 discovery，再创建 Note：

```sh
python3 .codex/skills/spec-driven-development/scripts/specctl.py new-note \
  --root . --class feature --slug first-capability --apply
```

依次完成 Problem、Goals、Non-goals、Proposal、Alternatives considered、Acceptance criteria、Verification plan、Risks 和 Approval。验收标准写用户或系统能观察到的结果，例如“同一 idempotency key 的重试返回同一个 hold”，不要写成“增加 `idempotency.py`”。

Agent 只把 Problem、Goals、Non-goals、Acceptance criteria 和高成本选择交给人类。人类确认后，Agent 在 `Approval` 中记录批准人、日期和批准范围。不要把未回复视为批准，也不要编造原话。

完成信号：

```sh
python3 .codex/skills/spec-driven-development/scripts/specctl.py check-note \
  --root . --path .agents/notes/proposed/feature/YYYY-MM-DD-first-capability.md \
  --target proposed
```

返回 `valid: true`。

## 4. 让实现始终追着 acceptance criteria 走

Agent 按验收标准切分实现，每个切片同时更新代码、相应测试和当前文档。建立一张简单 trace：criterion → implementation → check → evidence。测试失败时先判断是实现错误还是 spec 错误；不能为了保留实现而偷偷降低 oracle。

实现发现新信息时使用以下规则：

- 产品含义变化：暂停，更新 proposal，重新批准。
- 不可逆或高成本技术选择：暂停，提供 alternatives，重新批准。
- 可逆内部选择：Agent 决定，必要时同步 Note，继续。
- 纯修复且不改变批准含义：修复并重跑相关检查。

完成信号：每条 criterion 都有 PASS、FAIL 或 unresolved evidence；unresolved 不会被包装成完成。

## 5. 把验证命令接入仓库

在 `.agents/spec-driven-development.json` 中使用 argv 数组登记命令，避免 shell 字符串带来的解释差异：

```json
{
  "version": 1,
  "require_claude_symlink": true,
  "verification_commands": [
    {"name": "unit", "command": ["python3", "-m", "pytest", "-q"]},
    {"name": "lint", "command": ["python3", "-m", "ruff", "check", "."]}
  ]
}
```

选择能真正观察 acceptance path 的检查。unit test、mock、build、browser E2E、migration rehearsal 和人工视觉检查证明不同层次，不要互相冒充。凭据或外部环境缺失时记录 blockage，不要把 skip 写成 PASS。

完成信号：`specctl verify --root . --require-note` 执行并返回 `pass: true`。

## 6. Review 后再记录 shipped decision

Review 先对照已批准 Note 检查 scope、失败路径和文档漂移，再看代码风格。修复后，把 Note 从计划语气改写为当前事实：

- `Proposal` → `Decision`
- 计划中的 criteria 和风险 → 实际 `Verification` 与 `Consequences`
- 删除 `Plan`、`Migration plan`、`Acceptance criteria` 等 proposal-only headings
- 保留真正比较过的 alternatives，不补写看似完整但从未考虑的选项

然后校验、预览和迁移：

```sh
python3 .codex/skills/spec-driven-development/scripts/specctl.py check-note \
  --root . --path <note> --target implemented
python3 .codex/skills/spec-driven-development/scripts/specctl.py transition \
  --root . --path <note> --to implemented
python3 .codex/skills/spec-driven-development/scripts/specctl.py transition \
  --root . --path <note> --to implemented --apply
```

`transition` 不会自动改写内容。若 validator 失败，回到 Note 修复真实语义，而不是绕过检查。

## 7. 用小周期维持一致性

每次非平凡变更重复同一 lifecycle。定期删除重复规则、修复 dead links，并把已经被新决定完全取代的 Note 交叉链接或合并。只有当 implemented rationale 不再指导当前系统时才 archive，并把 archived 文件视为冻结历史。

建议每个变更在交付时只报告四类内容：完成了什么、哪些命令通过、哪些能力未验证、还需要人类决定什么。这样人类能够继续专注 idea，同时仍然拥有真实的验收边界。

## 不适用或需要缩减的场景

纯 typo、格式化和没有行为影响的局部机械修改不必新建 Note。一次性 disposable spike 可以在批准前进行，但必须与 production tree 隔离，不能悄悄成为实现。极小个人脚本可以缩减 architecture 文档，但仍应保留明确目标、验收和真实命令。受监管、医疗、金融或安全关键项目需要在本框架之上增加领域审查，它不能替代专业审批。
