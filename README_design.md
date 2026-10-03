# TUCO project page (v3): design notes

**Conventions.** Follows established robotics project pages (Diffusion Policy, UMI, Mobile ALOHA, RoboCasa): centered hero, dark pill links, a full-width teaser video, plain section titles, thin-rule tables, no decorative labels.

**Type and color.** Source Serif 4 for the title and section headings, Inter for text, JetBrains Mono for BibTeX (Google Fonts). White page with one accent, #6a3d9a, the purple that marks TUCO in the paper's figures.

**Width.** One 960 px column holds everything: video, figures, grid, table. On phones it becomes a single column with 16 px gutters, and the rollout grid shows 2×2 per task.

**Chart.** `static/chart.js` holds the success-rate data and draws the SVG at the column width (static copy inlined for no-JS). Hues: dataviz reference slots 1-5, validated. Offline preview: `../make_chart_preview.js` then `.py`.

**Placeholders.** Search `index.html` for `class="tbd"` (arXiv id). When arXiv or code goes live, replace `<span class="pill is-disabled">` with `<a class="pill" href="...">`.

**Assets.** `assets/*-1200/2000.jpg` are the web figures, `assets/full/` holds the originals (white background), `assets/rollouts/` holds the clips and posters, and `assets/teaser_poster.jpg` is the teaser frame at 8 s.

**Publish.** Plain static folder; GitHub Pages serves it as-is.
