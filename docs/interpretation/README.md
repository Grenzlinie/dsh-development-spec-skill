# 图文解读的可复现构建

`spec-driven-development-interpretation.tex` 使用 `paper-jiedu-latex` 的固定版式约束，保留 `ctexart`、Fandol、keybox、页眉页脚和图块宏。图表的机器数据源是 `playground/evaluation/unblinded-summary.json`，产品截图来自 `playground/evaluation/screenshots/`。

在本目录执行两遍 XeLaTeX。

```sh
xelatex -interaction=nonstopmode -halt-on-error spec-driven-development-interpretation.tex
xelatex -interaction=nonstopmode -halt-on-error spec-driven-development-interpretation.tex
```

逐页视觉检查使用 Homebrew Poppler。工作区 dependency runtime 中的另一份 `pdftoppm` 缺少 Adobe-GB1 mapping，会在预览中丢失中文，因此不用于最终检查。

```sh
mkdir -p rendered
/opt/homebrew/bin/pdftoppm -png -r 110 \
  spec-driven-development-interpretation.pdf rendered/page
```

最终 PDF 保留在仓库。`.aux`、`.log`、`.out` 和逐页渲染目录属于临时构建产物，不进入 Git。
