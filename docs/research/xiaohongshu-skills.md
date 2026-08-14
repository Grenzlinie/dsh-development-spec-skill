# GitHub 上的小红书 Skill 调研

检索日期为 2026-08-14。结果来自 GitHub 插件的 repository search、code search 和固定 commit 文件读取。本页只总结能从仓库文件确认的能力，不使用未读取的 star、下载量或宣传数据判断质量。

| 仓库 | 当前定位 | 本项目可复用的做法 | 使用边界 |
|---|---|---|---|
| [white0dew/XiaohongshuSkills](https://github.com/white0dew/XiaohongshuSkills/tree/633e9dc8a459c76c16747473e46207321c063176) | 通过 Chrome DevTools Protocol 完成登录检测、图文或视频填充、多账号、搜索和数据抓取 | 发布前预览、登录态检查、Cookie 隔离、DOM 变化时显式维护 selector | 仓库明确提示限流、封号和封禁风险，且当前说明只测试 Windows。本项目不执行自动发布 |
| [Xiangyu-CAS/xiaohongshu-ops-skill](https://github.com/Xiangyu-CAS/xiaohongshu-ops-skill/blob/5b0b80b7261396955de0494df18182f2401cabc4/SKILL.md) | 覆盖账号定位、选题、内容、发布与复盘的运营 Skill | 先定受众与内容支柱，每页留一个可理解观点，发布按钮出现后默认停手等待确认 | 强依赖指定浏览器 profile 和项目内知识库，直接复制会带入不适合本仓库的运行假设 |
| [vivy-yi/xiaohongshu-skills](https://github.com/vivy-yi/xiaohongshu-skills/tree/b42ff691c78c07bc917881d8ad3460b83fc0acb1) | 将标题、封面、选题、运营和分析拆成多个小 Skill | 封面保持一个焦点、3 比 4 高分辨率、强对比、标题缩短并在缩略图下检查 | 仓库中的点击率和成功比例属于其自身表述，本项目没有独立验证，因此没有拿来当宣传依据 |
| [op7418/guizang-social-card-skill](https://github.com/op7418/guizang-social-card-skill/tree/cf4b810fac1c73fb65a2bb31d8c9278d82cbc4c5) | 从文章、截图和产品材料生成 3 比 4 社交卡、Live Photo 与跨平台封面 | 5 到 9 页的故事拆分、每页一个判断、真实截图作证据、HTML/CSS 排版、移动缩略图与溢出 QA | 视觉体系和模板规模较大，适合完整卡片生产。本项目只吸收内容密度、证据图片和 QA 方法，没有复制第三方代码 |

本项目最后采用了七页 3 比 4 卡片。封面只放一个判断，第二到第五页依次交代问题、框架、仓库证据和实验设计，第六页展示数值，第七页给出适用边界与 GitHub 入口。真实项目截图和冻结 scorecard 负责支撑判断，生成式图像只用于无文字封面底图。

自动发布留在本次范围之外。小红书发布涉及登录凭据、账号状态和平台风控，也会产生不可逆的对外内容。本仓库只交付可编辑源文件、PNG 卡片和文案，由人类检查后决定是否发布。
