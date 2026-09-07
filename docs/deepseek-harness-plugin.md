# DeepSeek Harness 插件开发与社区发布说明

本文记录 2026-08-14 对 DeepSeek Harness 官方仓库 `47f943859bef60e4160492346772ded9b24f765a` 的核对结果，以及本仓库采用的插件封装。Harness 处于 developer preview，兼容性可能发生破坏性变化；发布新版本前应重新检查本文引用的官方源码。

## 先分清三件事

DeepSeek Harness 插件不是 Codex 插件。它不使用 `.codex-plugin/plugin.json`，也不发布到 Codex marketplace。

在 Harness 当前体系里：

1. **Cordis 插件模块**导出 `apply(ctx)`，通过 `ctx` 注册工具、Skill、服务、事件监听等能力。
2. **bundle** 是可安装 npm/GitHub 包。根 `package.json` 通过 `dsh.bundle.patch` 指向 `cordis.patch.yml`，patch 把一个或多个 Cordis 模块插入 profile。
3. **profile** 是用户机器上的可启动组合，由 `dsh plugin --profile <name> ...` 管理。作者发布 bundle，用户拥有 profile；一个 package 不能同时声明二者。

这些结论分别来自官方[第一个插件教程](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/index.zh.md)、[打包与安装教程](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)和 [`dsh plugin` 实现](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/src/plugin.ts)。

## Skill 型插件应该怎样接入

Harness 的 `@deepseek-ai/dsh-base` 已经挂载 Skill registry、filesystem provider 和模型侧 `skill` tool。安装包无需替换这些基础行，只需新增一个 provider。

本包的 `cordis.patch.yml` 插入 `dsh-spec-driven-development`，其 `apply(ctx)` 调用 `ctx.skills.registerProvider()`。provider 的目录项立即可见，正文只在模型调用 `skill` 工具或用户输入 `/spec-driven-development` 时读取。`resourceBase` 指向安装包内 Skill 目录，因此正文引用的 `references/`、`scripts/` 和 `assets/` 能按需解析。

这一实现对照官方 [`dsh-skill-badge` provider](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/skill/skill-badge/src/index.ts)；调用策略和资源语义来自官方 [`dsh-skill` 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/skill/skill/README.zh.md)与 [`dsh-tool-skill` 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/skill/tool-skill/README.zh.md)。

## package 结构

```text
package.json                         # dsh.bundle.patch
cordis.patch.yml                     # 插入 Cordis provider
dsh-plugin/index.js                  # 无依赖、惰性 Skill provider
skills/spec-driven-development/      # 生成的 Harness 发布投影
  SKILL.md
  references/
  scripts/
  assets/
```

`.codex/skills/spec-driven-development/` 仍是唯一可编辑来源。`scripts/sync_dsh_plugin.py --write` 生成发布投影，`--check` 对文件集合和字节内容做全量比较。这样既保留现有仓库入口，也不维护两份会逐渐分叉的指令。

package 没有 `prepare` 或 `postinstall`。官方教程指出，GitHub 安装 TypeScript 源码时通常需要 `prepare`，pnpm 10 还要求用户显式放行安装期构建。本插件只需要 Node 内置的 `fs` 和 `url`，直接交付 ESM JavaScript，因此不触发这项安装期执行授权。

## 安装、验收与卸载

```sh
dsh plugin --profile web add "github:Grenzlinie/dsh-development-spec-skill#v0.1.0"
dsh --profile web --dump-config
dsh --profile web
```

验收分三层：

- `--dump-config` 必须显示 `dsh-spec-driven-development` bundle 层和 provider 行。
- 无密钥 loader smoke 必须能列出并加载 `spec-driven-development`，且资源目录存在。
- 在真实会话输入 `/spec-driven-development` 后，模型应收到同一份 `<skill_content>`；这一步需要用户自己的模型配置，不由 package test 冒充。

移除命令：

```sh
dsh plugin --profile web remove dsh-spec-driven-development
```

## 社区到底在哪里

官方 README 指向三个社区入口：

- GitHub Discussions：反馈、问题和交流；
- GitHub [`dsh-plugin` topic](https://github.com/topics/dsh-plugin)：插件仓库的官方发现机制；
- DeepSeek Harness Discord：即时社区讨论。

官方[贡献指南](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/CONTRIBUTING.zh.md)同时明确：项目目前不接收外部 PR，插件作者应在自己的 GitHub 仓库发布并添加 `dsh-plugin` topic。因此“发布到官方插件社区”的可验证含义是：公开仓库的默认分支包含可安装 bundle，仓库 topic 包含 `dsh-plugin`，README 给出可复制安装命令。它不意味着进入 DeepSeek 官方仓库，也不代表官方审核或背书。

GitHub topic 之外已经出现若干第三方精选目录和一键安装器。它们可以增加曝光，但没有一个在官方 README 中被定义为唯一 marketplace。本仓库先满足官方发现机制；任何第三方目录投稿都单独记录其规则和审核状态。

## 发布门

发布 tag 前执行：

```sh
python3 scripts/sync_dsh_plugin.py --check
node --test tests/dsh-plugin.test.mjs
python3 scripts/verify_dsh_package.py
python3 .codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note
```

随后在隔离的临时 `DSH_HOME` 中，用官方当前版本安装本地 checkout，检查 `--dump-config` 和 Skill loader。只有默认分支、tag、topic 和安装回读全部成立，才可以称为已发布。
