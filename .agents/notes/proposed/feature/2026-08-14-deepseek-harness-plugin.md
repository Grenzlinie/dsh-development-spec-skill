# Agent Note: DeepSeek Harness Plugin

Status: proposed

## Problem

仓库已有可供 Codex 和其他 Agent 读取的 `spec-driven-development` Skill，但 DeepSeek Harness 用户目前只能手工复制 `.codex/skills/` 内容。仓库既不是可由 `dsh plugin` 安装的组合包，也没有进入 DeepSeek Harness 官方指定的 GitHub `dsh-plugin` 发现入口，因此不能称为 Harness 插件或社区发布物。

## Goals

- 将现有 Skill 封装为符合当前 DeepSeek Harness bundle manifest 与 Cordis 插件 API 的可安装包。
- 保持 `.codex/skills/spec-driven-development/` 为指令、引用、脚本和模板的唯一可编辑事实源，并以可校验的生成投影供 Harness 包分发。
- 支持从本地 checkout、固定 Git commit 和 npm tarball 三种路径安装，并能在 `web` profile 的 skill 目录中发现和加载。
- 用无密钥自动化测试覆盖注册、资源路径、bundle patch、pack 内容和真实 Harness loader smoke。
- 在 GitHub 仓库公开发布，并按官方要求添加 `dsh-plugin` topic；记录开发预览兼容性和安全边界。

## Non-goals

- 不修改或向 `deepseek-ai/deepseek-harness` 官方仓库提交代码；其贡献指南当前明确不接收外部 PR。
- 不创建 Codex `.codex-plugin/plugin.json`，也不把 Codex marketplace 当作 Harness 社区。
- 不增加 MCP、后台服务、遥测、凭证读取或自动执行生产代码的能力。
- 本次不承诺 npm registry 发布；GitHub 安装和可复核 tarball 已满足 Harness 官方文档中的发布路径，npm 可在取得 registry 发布权限后另行执行。

## Proposal

根 `package.json` 声明 `dsh.bundle.patch`，`cordis.patch.yml` 插入一个普通 Cordis 插件模块。该模块依赖已由 `@deepseek-ai/dsh-base` 提供的 `skills` 服务，并通过 `ctx.skills.register()` 注册 `spec-driven-development`。插件在安装目录读取随包分发的 `skills/spec-driven-development/SKILL.md`，去除 YAML frontmatter 后注册正文，同时把 skill 目录作为 `resourceBase`，使 `references/`、`scripts/` 与 `assets/` 保持可寻址。

`scripts/sync_dsh_plugin.py` 将 canonical `.codex/skills/spec-driven-development/` 投影到 package 的 `skills/` 目录，并支持 `--check` 拒绝漂移。package 保持纯 JavaScript、无安装脚本、无运行时第三方依赖；GitHub 安装不要求用户授权 `prepare`。README 提供官方 `dsh plugin --profile web add github:Grenzlinie/dsh-development-spec-skill#<sha>`、`--dump-config`、运行、升级和移除命令。

社区发布以官方 README 和 CONTRIBUTING 指定的 GitHub `dsh-plugin` topic 为权威入口。第三方精选列表只作为可选扩散渠道，不冒充官方 marketplace。

## Alternatives considered

**只增加 `.dsh/skills/`。** Harness filesystem provider 可以直接发现项目 Skill，但用户必须把仓库本身作为工作区或手工复制，不能通过 `dsh plugin` 安装，因此不能满足插件交付目标。

**覆盖 `skill-filesystem` 的 `customSkillDirs`。** bundle patch 对同一行是整段替换，不是深度合并；这样容易覆盖用户或基础层配置。运行时注册使用公开 `ctx.skills` 扩展点，边界更小。

**在安装时编译 TypeScript。** GitHub 安装会触发 pnpm 的构建授权门。当前插件只需读取静态 Skill 并注册，纯 ESM JavaScript 足够，也能避免安装时执行代码。

## Acceptance criteria

- [ ] 根 package 是合法的 Harness bundle，`dsh.bundle.patch` 指向存在的 patch，patch 插入可解析的插件入口。
- [ ] 插件加载后注册且仅注册一个名为 `spec-driven-development`、模型和用户均可调用的 Skill，并在释放时注销。
- [ ] 注册正文与 canonical `SKILL.md` 正文一致，全部引用、脚本和模板进入发布包且相对资源基底正确。
- [ ] `npm pack --dry-run` 只包含声明的插件、Skill、许可证和文档文件，不包含实验运行、截图、会话、缓存或密钥。
- [ ] 使用当前官方 DeepSeek Harness 运行时完成无密钥加载 smoke；`dsh --profile <test> --dump-config` 显示本 bundle 层。
- [ ] README 给出可复制的安装、固定 commit、安全、验证、升级和移除说明，并准确说明 developer preview 边界。
- [ ] GitHub 默认分支包含已验证插件，仓库 topic 包含 `dsh-plugin`，可从官方 topic 页面发现。

## Verification plan

- `node --test tests/dsh-plugin.test.mjs` 检查 bundle manifest、注册生命周期、正文和资源。
- `python3 scripts/sync_dsh_plugin.py --check` 检查 canonical 与 Harness 投影完全一致。
- `npm pack --dry-run --json` 配合 `python3 scripts/verify_dsh_package.py` 检查发布清单。
- 在临时 `DSH_HOME` 中执行固定版本 `npx @deepseek-ai/dsh` 的本地安装、`--dump-config` 与 keyless skill loader smoke。
- 继续执行仓库 `specctl verify --root . --require-note`、Skill quick validation、Markdown link 检查和 `git diff --check`。
- 通过 GitHub API 读取默认分支、commit、topics 和公开仓库状态，证明社区发布完成。

## Risks

- DeepSeek Harness 处于 developer preview，bundle 与 skill API 可能发生破坏性变化；package 将兼容基线和固定验证证据写入 README，不宣称永久兼容。
- GitHub topic 允许任何仓库自行添加，证明的是官方发现机制已满足，不代表 DeepSeek 官方审核或背书。
- Skill 能指导 Agent 写代码和执行本地脚本；它不提高 Harness 自身权限，所有文件和 shell 操作继续受用户 profile 的 sandbox 与 approval policy 控制。

## Approval

用户于 2026-08-14 明确要求“把这个 skill 做成一个 DeepSeek Harness 的插件，发布到 DeepSeek Harness 的插件社区里”，并进一步澄清“不是 codex 的 plugin”，要求先按 DeepSeek Harness 自身开发要求和社区入口执行。该指令批准上述 Harness bundle、公开 GitHub 发布和官方 `dsh-plugin` topic 发现范围。
