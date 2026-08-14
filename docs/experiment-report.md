# 三组 Agent A/B 实验：Spec 在哪里改变了结果

三组配对 case 中，显式使用 `spec-driven-development` 的 treatment 最终平均为 98.17/100，直接从 idea 开发的 baseline 平均为 76.00/100，差值 22.17 分。差异主要来自过程分（+15.50/30），但产品分也提高 6.67/70。更有解释力的 first pass 信号是：baseline 在三个隐藏 oracle 上分别有 3、4、5 个失败 acceptance，treatment 为 0、1、0；唯一的 treatment first-pass 失败是 fresh Python test packaging，不是产品合同偏差。

这是三个小项目、同一类模型的一次示范性比较，不是普遍因果估计。它能说明这套框架在这些 case 中如何改变需求澄清、首轮偏差、repair 和长期一致性，不能单独证明换模型、换团队或扩大系统后仍有同样增益。

## 实验如何保持可复查

每个 case 的 idea、product oracle、分值和 condition map 在 builder 启动前锁定。Oracle 当时保存在 workspace 外，仓库只记录 SHA-256；六个 first pass 和一次统一 repair 完成后，oracle 原字节归档并复核 hash。Baseline 和 treatment 使用相同 builder model、reasoning effort、公开 brief、隔离权限和 repair 次数。

同一个 product-owner simulator 只回答产品行为、优先级和验收含义，不提供技术方案。Baseline 可以提问但三组都没有提问；treatment 分别经过 2、3、3 轮 proposal review 才获批准。Blind evaluator 先只看匿名 candidate 的 source、tests、handoff 和产品 oracle，写定 70 分产品 scorecard；随后才看 `.agents`、docs 和 evidence 评 30 分过程；最后才归档并打开 [condition map](../playground/evaluation/condition-map.json)。完整盲评见 [blind report](../playground/evaluation/blind-report.md)。

## 解盲结果

| Case | Baseline | Treatment | Product Δ /70 | Process Δ /30 | Total Δ /100 |
|---|---:|---:|---:|---:|---:|
| Research Runboard | A：73.0 | B：97.0 | +7.5 | +16.5 | +24.0 |
| Seat Hold API | B：75.0 | A：99.0 | +8.5 | +15.5 | +24.0 |
| Signal Drift | A：80.0 | B：98.5 | +4.0 | +14.5 | +18.5 |
| 平均 | 76.00 | 98.17 | +6.67 | +15.50 | +22.17 |

这里的 product score 包括隐藏 acceptance、robustness、UX/API/game quality 和 test quality；process score 包括 spec traceability、architecture/current docs consistency 和 reproducible handoff。数值和映射的机器可读版本在 [unblinded summary](../playground/evaluation/unblinded-summary.json)。

## Skill 首先改变的是“写代码之前发生什么”

Research Runboard 的 treatment 初版没有 `Attention`、failure priority 和 Retry，product owner 明确不批准；第二版补齐五状态、排序、组合过滤、移动端和无障碍标准后才实现。Baseline 没有提问，首轮正好缺这些内容，统一 repair 后才补齐。

Seat Hold API 的 treatment 经三轮才固定 body idempotency、`customer_id`、TTL 1..900、四态、`DELETE` cancellation、confirmed seat 永久占用、restart persistence 和重复取消冲突。Baseline 没有提问，虽自行写出并发和幂等设计，但首轮在产品合同上有四类偏差。

Signal Drift 的 treatment 首版选择二维 ring、WASD/Space/R 和 locked-time scoring，被退回；最终才固定水平 safe band、750ms damage、800ms grace、每秒计分、P/Escape/Enter、可见按钮、blur pause 和完整 restart。Baseline 同样从二维 ring 开始，repair 修复了大部分规则，却没有记录产品意图，最终仍保留二维移动目标环。

在这三组中，Skill 的直接作用不是让 Agent “更会写 React、SQLite 或 Canvas”，而是迫使它在实现前暴露隐含选择，并给 product owner 一个很小但真实的批准面。Treatment 共提出 8 次产品复审请求；baseline 为 0。

## Repair 之后，测试全绿仍不等于产品一致

统一 repair 把 baseline 的 12 个已报告 acceptance 缺口全部修到自报 PASS，六套 final tests/build 也全部通过。但 blind evaluator 仍发现三个 baseline 各有一个未被自有 tests 阻止的偏差：

- Runboard A 的 390px 页面不溢出，但内部列表出现横向滚动，owner、environment 和 timing 不再是可扫读信息。
- Seat B 仍把重复 `DELETE` 静默当作 `204`，并输出 lowercase `status`，与锁定的 uppercase `state` 合同冲突；其 `final.json` 却把对应项记为 PASS。
- Signal A 修复了 750ms、grace、计分和 controls，却保留二维移动目标环，偏离“水平扰动 + 中央 safe band”的玩法。

Treatment 也不是满分神话。Runboard B 的治理命令没有直接包含 load-bearing mobile test；Seat A 的 domain error envelope 不够稳定；Signal B 无法让已有浏览器后端自然触发 blur，因而把该子项保留为 unresolved。区别在于这些限制被当前 Note、docs 和 evidence 明确记录，没有被 test PASS 吞掉。

## 成本与收益

Treatment 明显增加前置时间和 artifacts：三组都经历 proposal、批准、current docs、implemented Note 和 criterion mapping。对于纯机械修改，这个成本不合理；本框架因此只要求非平凡变更使用完整 lifecycle。

对于本实验的三个非平凡项目，前置成本换来了两个收益。第一，产品偏差在写生产代码前暴露，treatment 的首轮产品失败接近于零。第二，产品与过程证据都能追到 owner-approved decision；blind process 平均 29.67/30，而 baseline 为 14.17/30。后者不是“文档越多分越高”，因为 evaluator 只给可连接到代码、tests、当前事实和真实命令的 artifacts 计分。

## 建议怎样使用这个结果

新项目可以采用 [采用指南](adoption-guide.md) 的完整流程，但应从一个高不确定、可在一周内完成的 feature 开始。记录三个量：批准前被发现的产品歧义、first-pass acceptance failure、以及 repair 后仍由独立 review 发现的偏差。如果流程只增加文档而不减少这些量，应删减模板或调整批准面。

不要把 22.17 分当作预测值。更稳妥的结论是：在这三个 case 中，显式 specification 和真实批准显著减少了首轮产品合同漂移，而 Agent Note、current docs 和 verification evidence 使独立 evaluator 更容易发现“测试通过但仍与产品不一致”的问题。

## 证据入口

- [协议与评分](../playground/README.md)
- [Oracle lock](../playground/protocol/oracle-lock.json) 与 [归档 oracles](../playground/evaluation/oracles/)
- [Product-owner 问答审计](../playground/evaluation/product-owner-qa.json)
- [六套 candidate source](../playground/runs/)
- [产品 scorecards](../playground/evaluation/product-scorecards/) 与 [blind scorecards](../playground/evaluation/blind-scorecards/)
- [命令结果](../playground/evaluation/command-results/) 与 [10 张截图](../playground/evaluation/screenshots/)
