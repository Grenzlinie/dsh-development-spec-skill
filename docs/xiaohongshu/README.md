# 小红书宣传图文

## 标题备选

1. 我让 Agent 写了 6 个项目，差了 22.17 分
2. 只给 AI 一句需求，最容易丢掉什么
3. 学生也能复用的 Agent 开发工作流

## 正文

我最近做了一个挺笨、也挺实在的实验。

同一类 Agent，同样的 idea 和资源，我让它写了 6 个小项目。前端、后端、小游戏各两份。一组拿到 idea 就开工，另一组必须先写 spec，经过产品确认以后再实现。

最后交给不知道分组身份的 evaluator 打分。

只给 idea 的平均分是 76.00。使用 spec-driven-development Skill 的平均分是 98.17。差了 22.17 分。

更有意思的是第一轮。直接开发的三组分别漏了 3、4、5 条隐藏验收。使用 Skill 的三组是 0、1、0。中间那个 1 来自 Python 测试打包，没有改坏 API 合同。

Agent 写代码的能力一直在线。容易出问题的是它替人做了产品决定。

Runboard 在手机上删掉 owner 和 timing。API 把重复取消继续当成功。小游戏把中央安全带做成二维移动目标环。代码能跑，测试也能绿，方向已经偏了。

这套 Skill 把工作分成八步。先读仓库，写清目标，形成可批准的 Agent Note。人只确认产品含义和高成本选择。Agent 再实现、验证、审查，最后把决定改写成当前事实。

我从 DeepSeek Harness 学到的一点很受用。`AGENTS.md`、当前文档、决策记录和测试要各管一类事实。文档参与开发，完成以后还能被命令检查。

仓库里放了 Skill、采用指南、六套源码、冻结 oracle、盲评 scorecard、命令结果和 10 张截图。三组案例太少，不能当普遍规律。它们足够让人看清一个问题。让 Agent 在写代码前暴露隐含选择，比写完以后追着修省事。

GitHub 项目名 `Grenzlinie/dsh-development-spec-skill`

你现在让 Agent 开发项目时，会先让它写 spec 吗？

#AI编程 #Codex #程序员 #计算机学生 #开源项目 #软件工程 #Agent #GitHub

## 配图顺序

1. `cards/01-cover.png`
2. `cards/02-problem.png`
3. `cards/03-framework.png`
4. `cards/04-harness.png`
5. `cards/05-experiment.png`
6. `cards/06-results.png`
7. `cards/07-takeaway.png`

## 发布前检查

- 检查 GitHub 分支已经公开可访问，再决定是否把链接写进评论区。
- 人工复核 22.17、76.00、98.17 和三组 first-pass 数字。
- 先用测试号或预览模式检查裁切，不使用自动点击发布。
- 不把三组 case 写成适用于所有模型和项目的普遍结论。
