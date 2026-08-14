# Spec-Driven Development

这个仓库把 DeepSeek Harness 的文档驱动开发经验整理成一套可复用、可执行、可验证的 Agent 开发框架。人类负责 idea、产品边界和验收含义；Agent 负责澄清、写 spec、实现、测试、审查，并让代码、文档和决策记录保持一致。仓库本身也是可由 `dsh plugin` 安装的 DeepSeek Harness bundle。

## 安装到 DeepSeek Harness

推荐固定发布 tag，避免上游分支后续变化改变实际安装内容：

```sh
dsh plugin --profile web add "github:Grenzlinie/dsh-development-spec-skill#v0.1.0"
dsh --profile web --dump-config
dsh --profile web
```

如果没有全局 `dsh` 命令，可将上述命令的 `dsh` 换成 `npx @deepseek-ai/dsh`。`--dump-config` 输出中应出现 `# == dsh-spec-driven-development` 层和 `spec-driven-development-skill` 行。启动后可以直接输入 `/spec-driven-development`，也可以描述一个非平凡软件项目，让模型根据目录描述自行加载该 Skill。

升级或移除：

```sh
dsh plugin --profile web update dsh-spec-driven-development
dsh plugin --profile web remove dsh-spec-driven-development
```

本包是纯 ESM JavaScript，不含 `prepare`、`postinstall`、遥测、网络请求或凭证读取。它只向 Harness 的 `ctx.skills` 注册一份惰性加载的 Skill；具体文件和 shell 权限继续由用户 profile 的 sandbox 与 approval policy 决定。DeepSeek Harness 仍处于 developer preview，当前兼容基线及社区入口调查见[插件开发与发布说明](docs/deepseek-harness-plugin.md)。

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
- [DeepSeek Harness 插件开发与社区发布说明](docs/deepseek-harness-plugin.md)

快速检查：

```sh
python3 .codex/skills/spec-driven-development/scripts/specctl.py inspect --root .
python3 scripts/sync_dsh_plugin.py --check
python3 scripts/verify_dsh_package.py
node --test tests/dsh-plugin.test.mjs
python3 -m unittest discover -s tests -v
python3 .codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note
```

`.codex/skills/spec-driven-development/` 是唯一可编辑事实源；`skills/spec-driven-development/` 是进入 npm/GitHub 安装包的生成投影。修改 canonical Skill 后运行 `npm run sync:dsh`，CI 和发布校验会拒绝两者漂移。

本仓库不把三组实验当作普遍因果证明。它们是可复查的示范性案例，用来观察同一类 Agent 在“只给 idea”和“显式使用 Skill”两种条件下的产品结果与过程一致性。
