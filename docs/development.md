# 开发流程

本仓库自身使用 `spec-driven-development` 开发。任何改变行为、架构、共享格式、流程或测试策略的工作，都先创建或更新 Agent Note。

## 开始工作

1. 运行 `git status --short --branch`，确认分支和用户已有改动。
2. 阅读 `AGENTS.md`、相关文档和当前 Agent Note。
3. 运行 `specctl inspect`，检查治理文件是否完整。
4. 把任务分类为机械/local 或非平凡变更。非平凡变更使用 `new-note` 创建 proposal。
5. 在 proposal 中完成 Problem、Goals、Non-goals、Proposal、Alternatives、Acceptance criteria、Verification plan、Risks 和 Approval。
6. 取得产品批准后再改生产文件。

命令默认只预览；需要写入时显式加 `--apply`：

```sh
python3 .codex/skills/spec-driven-development/scripts/specctl.py new-note \
  --root . --class feature --slug concise-topic
python3 .codex/skills/spec-driven-development/scripts/specctl.py new-note \
  --root . --class feature --slug concise-topic --apply
```

## 实现与同步

按 acceptance criterion 切分工作。每个切片同时更新承担该行为的代码、测试和文档。一个事实只保留一个权威位置：仓库常驻规则放 `AGENTS.md`，当前架构和操作方法放 `docs/`，为什么选择该方案放 Agent Note，具体行为由代码和测试固定。

产品目标、范围、验收含义或不可逆成本发生变化时，暂停实现并重新取得批准。文件布局、内部接口、测试辅助函数等可逆选择由 Agent 决定，除非它们引入产品、运维、安全或长期成本。

## 完成工作

1. 运行与每条 acceptance criterion 对应的检查。
2. 检查失败路径、无障碍或 API 易用性、安全、并发和恢复行为中与任务相关的部分。
3. 对照 proposal 审查 diff，删除未批准的范围扩张。
4. 把 proposal 改写为当前事实：`Proposal` 变成 `Decision`，验收计划变成实际 `Verification`，风险变成真实 `Consequences`。
5. 先运行 `check-note --target implemented`，再预览和执行 `transition --to implemented --apply`。
6. 运行仓库级 `verify --require-note`，在交付中报告原样命令和结果。

## 本地边界

依赖目录、缓存、构建输出和覆盖率产物不进入仓库。实验的六套源码、lockfile、测试、prompts、manifest、scorecard 和必要截图保留。除非用户明确要求，本项目不安装全局 Skill，不创建提交，不推送远端，也不创建 PR。
