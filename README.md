# Spec-Driven Development

这个仓库把 DeepSeek Harness 的文档驱动开发经验整理成一套可复用、可执行、可验证的 Agent 开发框架。人类负责 idea、产品边界和验收含义；Agent 负责澄清、写 spec、实现、测试、审查，并让代码、文档和决策记录保持一致。

核心入口是 [`.codex/skills/spec-driven-development/SKILL.md`](.codex/skills/spec-driven-development/SKILL.md)。配套的 `specctl.py` 负责初始化治理文件、创建和校验 Agent Note、执行状态迁移与仓库验证。方法依据、采用步骤和实验结果分别见：

- [DeepSeek Harness 案例研究](docs/deepseek-harness-case-study.md)
- [新项目采用指南](docs/adoption-guide.md)
- [架构](docs/architecture.md)
- [开发流程](docs/development.md)
- [测试与证据边界](docs/testing.md)
- [A/B 实验协议](playground/README.md)
- [A/B 实验综合报告](docs/experiment-report.md)
- [图文长篇解读](docs/interpretation.md)
- [可打印 PDF 解读](docs/interpretation/spec-driven-development-interpretation.pdf)
- [小红书宣传图文与 3:4 卡片](docs/xiaohongshu/README.md)
- [GitHub 小红书 Skill 调研](docs/research/xiaohongshu-skills.md)

快速检查：

```sh
python3 .codex/skills/spec-driven-development/scripts/specctl.py inspect --root .
python3 -m unittest discover -s tests -v
python3 .codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note
```

本仓库不把三组实验当作普遍因果证明。它们是可复查的示范性案例，用来观察同一类 Agent 在“只给 idea”和“显式使用 Skill”两种条件下的产品结果与过程一致性。
