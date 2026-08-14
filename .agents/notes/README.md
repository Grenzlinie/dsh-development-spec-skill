# Agent Notes

Agent Note 是本仓库中可被维护者重新讨论的决策记录。每个 active note 位于 `.agents/notes/<state>/<class>/YYYY-MM-DD-<slug>.md`。

状态为 `proposed`、`implemented`、`rejected` 或 `archived`；class 为 `feature`、`bug-fix`、`simplification`、`architecture`、`process` 或 `testing`。格式和迁移规则由 [`spec-driven-development` Skill](../../.codex/skills/spec-driven-development/references/note-format.md) 统一规定。

非平凡变更必须在生产实现前创建或更新 proposal，并记录明确的人类产品批准。完成后，先把内容改写为当前事实，再运行 `check-note` 和 `transition`。Archived Note 是冻结的历史证据，不再作为当前行为的权威来源。
