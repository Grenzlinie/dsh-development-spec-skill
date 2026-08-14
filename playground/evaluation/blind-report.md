# Blind evaluation report

本报告始终使用 `candidate-a` / `candidate-b`，未读取或使用候选身份映射、封闭补充说明或既有结论。产品分在过程材料打开前已冻结；最终总分以 repair 后实际产品为主，过程材料只能增加 30 分过程分，不能覆盖独立发现的产品缺陷。

## 结果总览

| Case | Candidate | Product /70 | Process /30 | Total /100 | First-pass failed acceptance → final | 其他未决证据 |
|---|---|---:|---:|---:|---:|---|
| research-runboard | candidate-a | 60.0 | 13.0 | 73.0 | 3 → 0 | 无 |
| research-runboard | candidate-b | 67.5 | 29.5 | 97.0 | 0 → 0 | 无 |
| seat-hold-api | candidate-a | 69.0 | 30.0 | 99.0 | 1 → 0 | 无 |
| seat-hold-api | candidate-b | 60.5 | 14.5 | 75.0 | 4 → 0 | final 自报与实际 repeat-cancel 语义仍冲突 |
| signal-drift | candidate-a | 65.0 | 15.0 | 80.0 | 5 → 0 | 无 |
| signal-drift | candidate-b | 69.0 | 29.5 | 98.5 | 0 → 0 | 实际 blur 端到端子检查 1 → 1 |

## research-runboard

`candidate-a` 的 repair 有效补齐了 Attention、优先级、可见 Retry 与对应测试；桌面产品层级清楚，搜索、组合过滤、空状态和本地 Retry 均通过。主要失分来自 390×844：页面本身没有横向溢出，但 runboard 内部出现横向滚动条，紧凑列表省略 owner、environment 和 timing，失败原因也发生明显截断。其过程证据能说明 repair 做了什么，却没有独立的批准记录、决策边界或当前架构/测试权威。

`candidate-b` 在产品与过程两侧都更完整。十条 seed data 的分组与组内时间排序、跨字段搜索、汇总计数、Retry 计数迁移以及移动卡片字段保留均通过。真实 390×844 检查显示 owner、method/model、compute、timing、status、failure reason 和 Retry 同时可读。Agent Note、当前 docs、测试和 final evidence 对同一产品含义保持一致；候选自带的 `npm run test:layout` 也在 localhost 授权后通过。

## seat-hold-api

`candidate-a` 对锁定 API 最忠实：body idempotency、TTL 1..900、UTC 假时钟、恰好到期、四态状态机、重复两请求竞争、restart persistence、OpenAPI 和 fresh-install 都得到直接测试。first pass 唯一缺口是 Python 3.13 fresh collection 的 `tests` package import，repair 仅修复测试打包与交接，不改变产品。两个 implemented notes 清楚区分产品决定与 repair 决定；文档、代码、测试和验证配置一致。

`candidate-b` 的 repair 从四个重大 first-pass 缺口恢复了绝大部分产品能力：body 字段、TTL、DELETE、confirmed seat、restart 和 OpenAPI 都已实现。然而最终源码仍把重复 DELETE 当作幂等成功并返回 `204`，与“只有第一次成功取消返回 204、终态非法转换不得静默成功”冲突；同时表示使用 lowercase `status`，而锁定表示为 uppercase `state`。final evidence 将 SH-04 标作 PASS，因此过程追踪不能替代独立产品检查。Handoff 可复现，但缺少明确批准边界和当前架构/测试权威。

## signal-drift

`candidate-a` 通过一次大 repair 补齐了 750ms、800ms grace、每秒计分、P/Escape、Enter、可见按钮、blur pause、100ms clamp 和移动浏览器证据。核心确定性与生命周期测试扎实，双视口无溢出，暂停状态醒目。主要产品扣分是目标漂移：锁定意图是水平扰动下维持中央安全带，最终产品改为二维移动目标环并加入上下控制；视觉精致，但玩法不是同一个。缺少可回溯的批准/决策记录使这一偏移无法在实现前被拦截。

`candidate-b` 的水平 marker、中央 safe band、exposure meter、三条 lives、计分和 paused overlay 与锁定玩法高度一致。16 个测试精确覆盖 749/750ms、800ms grace、dt clamp、restart、DOM-free core 和 shell 边界；浏览器中按钮与 P/Escape 均实际通过。过程证据明确保留真实 blur 事件未能由现有浏览器后端自然触发的缺口，没有把静态 handler 检查伪装成端到端结果。

## First pass 与 repair

- RR candidate-a：3 个产品缺口全部修复；最终仍有未被 repair runner 捕捉的移动信息保留问题。
- RR candidate-b：first pass 与 final 均无产品缺口，repair 是有限复核与证据重跑。
- Seat candidate-a：1 个 fresh Python import 缺口修复，产品行为不变。
- Seat candidate-b：4 个报告缺口均被 final evidence 标记为修复；盲评仍独立发现 repeat-cancel 与 state/status 表示偏差。
- Signal candidate-a：5 个报告缺口全部修复，但 repair 没有纠正二维移动目标环相对水平安全带的产品偏移。
- Signal candidate-b：报告产品缺口保持 0；真实 blur 环境证据缺口保持 1，且被诚实保留。

## 环境与方法限制

- 所有六套 fresh install 与 tests 均通过；Web tests 分别为 8、9、10、16，API tests 分别为 13、10。四个 Web production build 与两个 Python package build 均通过。
- Python 安装/隔离构建第一次受到沙箱网络限制；按锁文件授权联网后成功。Seat candidate-b 的系统 `python3` 是 3.9.6，低于其 Python 3.11+ 前提，因此改用已安装的 Python 3.13。
- 四个 Vite preview 首次均出现 `listen EPERM: operation not permitted 127.0.0.1:<port>`；受控 localhost 授权后完成真实浏览器检查。
- 浏览器评分基于 1440×900 与 390×844 的截图、DOM 尺寸、真实搜索/过滤/Retry、Pause/Resume 与 P/Escape；没有进行完整 screen-reader 或辅助技术审计。
- Signal candidate-b 的真实 blur 端到端触发仍未决；源码和静态测试存在，但本报告不把它算作浏览器实证。
- 这是三组配对案例，分数适用于这六个最终交付，不外推为一般性因果结论。

## 证据入口

- 产品分：`playground/evaluation/product-scorecards/`
- 完整盲评分：`playground/evaluation/blind-scorecards/`
- 命令与环境结果：`playground/evaluation/command-results/`
- 双视口截图：`playground/evaluation/screenshots/`

