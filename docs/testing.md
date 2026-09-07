# 测试与证据边界

测试分为框架验证与实验验收。前者证明治理工具按声明工作；后者比较六个应用候选是否满足预先锁定的产品 oracle。两类证据不能互相替代。

## 框架验证

```sh
python3 -m unittest discover -s tests -v
python3 /Users/siyuliu/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/spec-driven-development
python3 .codex/skills/spec-driven-development/scripts/specctl.py verify \
  --root . --require-note
```

`unittest` 覆盖 preview/apply、拒绝覆盖、路径限制、Note 格式、合法与非法迁移、bootstrap 幂等性和 `verify`。官方 `quick_validate.py` 只证明 Skill 的目录和 metadata 合法，不证明工作流有效。仓库 `verify` 证明治理文件、Note 和配置命令一致，也不等于三个示例产品正确。

## 实验验收

每个 case 在 builder 开始前锁定隐藏 oracle 并记录 SHA-256。前端和游戏执行单元测试、production build、浏览器交互与截图检查；后端执行单元与黑盒 API 测试，并覆盖假时钟、重复请求和并发竞争。具体命令由 `playground/evaluation/` 的 runner 统一执行。

产品盲评只读取候选源码、运行结果和产品证据，不读取其 baseline/treatment 身份。过程盲评随后读取完整 artifacts，检查 spec traceability、决策边界、文档同步和交付可复现性。全部分数冻结后才解盲。

## 结果解释

自动化 PASS 表示对应 oracle 和命令在记录的环境中通过。截图是渲染证据，不自动证明可访问性。mock 或 fake clock 证明受控输入下的逻辑，不证明外部时钟或数据库部署。三对结果是示范性比较，样本量不足以断言该 Skill 对所有项目或 Agent 都有因果提升。
