# Playground：三组配对 Agent 实验

这里比较同一类 builder agent 在两种条件下开发三个小项目：baseline 只接收 idea 和正常工程约束；treatment 接收同一 idea，并被要求使用本仓库的 `spec-driven-development` Skill。实验同时观察产品验收和过程一致性。

## Cases

| Case | 技术栈 | Idea |
|---|---|---|
| `research-runboard` | React + TypeScript | 面向实验室成员的 research run monitor。 |
| `seat-hold-api` | FastAPI + Python + SQLite | 有过期、确认、取消和并发保护的 seat hold API。 |
| `signal-drift` | Canvas + TypeScript | 可暂停、重开并可确定性测试的键盘小游戏。 |

每个 case 的公开 brief 位于 `cases/<case>/brief.md`。Builder 开始前，产品 oracle 保存于 workspace 外的 sealed 目录并记录 SHA-256；两名 builder 完成后才归档到 `evaluation/oracles/`。

## 公平性控制

- baseline 和 treatment 使用相同 model、reasoning effort、idea、运行时间级别、文件权限、网络规则和一次 repair 机会。
- 同一 case 使用同一个 product-owner simulator 回答产品问题；simulator 不提供实现方案。
- builder 只读自己的工作目录、公开 brief 和条件允许的 instructions。禁止读取 sibling candidate、sealed oracle、evaluation mapping 和既有结果。
- treatment 的治理差异只有显式使用 Skill；框架或领域常规工具对两边相同。
- first pass 结束后，统一 runner 给出失败检查；两边都获得一次根据同类证据修复的机会。
- evaluator 先看匿名 candidate 的产品源码和运行证据，再看过程 artifacts；分数冻结后才解盲。

## 评价

总分 100，产品与过程保持均衡：

| 维度 | 分值 |
|---|---:|
| 隐藏 acceptance criteria | 35 |
| 鲁棒性和失败路径 | 10 |
| UX、API 或游戏手感 | 10 |
| 测试质量 | 15 |
| spec traceability 和批准边界 | 15 |
| 架构与当前文档一致性 | 10 |
| 可复现 handoff | 5 |

前三项和产品实际测试为 product pass；后三项及 tests 的过程质量为 process pass。评分标准在 oracle 锁定时同时冻结。

## 证据保留

仓库保留六套 source、lockfile、tests、prompts、问答、manifest、命令结果、scorecards、截图、oracle hash 和最终报告。`node_modules`、虚拟环境、build、coverage、cache、临时数据库和浏览器 profile 不保留。

三对结果只是一组可审查的 case study。它可以暴露流程是否改变需求澄清、验收覆盖和一致性，不能独立证明对其他模型、任务或规模同样有效。
