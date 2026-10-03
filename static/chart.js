/* TUCO real-robot success-rate chart.
   buildChartSVG(width, {narrow}) is a pure function that returns SVG markup, so the same code
   draws the page chart in the browser and the PNG preview offline (node + a rasterizer).
   Data: content_spec.md v3, section 2.5, copied verbatim. */
(function (root) {
  'use strict';

  var CATS = ['Peg', 'StackCube', 'CupCake', 'Average'];

  // kind: 'ours' (emphasized), 'method' (curation baseline, categorical hue), 'ref' (training-data reference)
  // Categorical hues: slots 1-5 of the dataviz reference palette, in fixed order.
  var SERIES = [
    { name: 'TUCO (ours)', label: 'TUCO (ours)', kind: 'ours', color: '#6a3d9a', v: [82.5, 75.0, 100.0, 85.8] },
    { name: 'CUPID', label: 'CUPID', kind: 'method', color: '#2a78d6', v: [75.0, 65.0, 80.0, 73.3] },
    { name: 'DataMIL', label: 'DataMIL', kind: 'method', color: '#eb6834', v: [22.5, 65.0, 100.0, 62.5] },
    { name: 'FAKTUAL', label: 'FAKTUAL', kind: 'method', color: '#1baf7a', v: [10.0, 75.0, 100.0, 61.7] },
    { name: 'Success Similarity', label: 'Success Similarity', kind: 'method', color: '#eda100', v: [5.0, 50.0, 60.0, 38.3] },
    { name: 'Random', label: 'Random', kind: 'method', color: '#e87ba4', v: [7.5, 57.5, 12.5, 25.8] },
    { name: 'All sim data (10 real + 1,200 sim)', label: 'All sim data', kind: 'ref', color: '#8a8694', dash: '7 4', v: [17.5, 40.0, 20.0, 25.8] },
    { name: '10 real demos only', label: '10 real demos only', kind: 'ref', color: '#a9a5b2', dash: '2 3', v: [15.0, 35.0, 0.0, 16.7] }
  ];

  var INK = '#1c1a22', INK2 = '#3a3743', MUTED = '#6c6877', GRID = '#ecebf0', SURFACE = '#ffffff';
  var FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(v) { return v.toFixed(1); }
  // rough text width for layout (Inter averages ~0.56 em per character)
  function textW(s, size, bold) { return s.length * size * (bold ? 0.6 : 0.56); }

  // On narrow screens an end label longer than ~10 characters breaks onto two lines at its middle space.
  function labelLines(s, narrow) {
    if (!narrow || s.label.length <= 10 || s.label.indexOf(' ') < 0) return [s.label];
    var mid = s.label.length / 2, best = -1;
    for (var i = 0; i < s.label.length; i++) if (s.label[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    return [s.label.slice(0, best), s.label.slice(best + 1)];
  }

  function layout(width, opts) {
    var narrow = !!(opts && opts.narrow);
    var fs = narrow ? 11 : 12.5;
    var labelled = SERIES.filter(function (s) { return !narrow || s.kind !== 'method'; });
    var maxLabel = 0;
    labelled.forEach(function (s) {
      labelLines(s, narrow).forEach(function (t) { maxLabel = Math.max(maxLabel, textW(t, fs, s.kind === 'ours')); });
    });
    var m = { top: 30, left: narrow ? 34 : 46, bottom: 34, right: Math.ceil(maxLabel + 26) };
    var height = narrow ? 320 : 420;
    var pw = width - m.left - m.right, ph = height - m.top - m.bottom;
    var pad = narrow ? 10 : 28;
    var xs = CATS.map(function (_, i) { return m.left + pad + i * (pw - 2 * pad) / (CATS.length - 1); });
    var y = function (v) { return m.top + ph * (1 - v / 100); };
    return { narrow: narrow, fs: fs, xfs: narrow ? 10.5 : fs, m: m, width: width, height: height, pw: pw, ph: ph, xs: xs, y: y, labelled: labelled };
  }

  // Place end labels: keep each at its line end unless it collides, then push apart and add a leader line.
  function placeEndLabels(L) {
    var lh = L.fs + 2, gap = 4;
    var items = L.labelled.map(function (s) {
      var lines = labelLines(s, L.narrow);
      return { s: s, lines: lines, h: lines.length * lh, target: L.y(s.v[3]) };
    });
    items.sort(function (a, b) { return a.target - b.target; });
    // it.y is the vertical centre of the label block
    items.forEach(function (it, i) {
      it.y = it.target;
      if (i > 0) { var p = items[i - 1]; it.y = Math.max(it.y, p.y + p.h / 2 + gap + it.h / 2); }
    });
    var bottom = L.m.top + L.ph + L.fs;  // labels may sit slightly below the 0 line
    var last = items[items.length - 1];
    var over = last ? last.y + last.h / 2 - bottom : 0;
    if (over > 0) items.forEach(function (it) { it.y -= over; });
    for (var i = items.length - 2; i >= 0; i--) {
      var n = items[i + 1];
      items[i].y = Math.min(items[i].y, n.y - n.h / 2 - gap - items[i].h / 2);
    }
    items.forEach(function (it) { it.lh = lh; });
    return items;
  }

  function buildChartSVG(width, opts) {
    var L = layout(width, opts);
    var o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" class="chart-svg" width="' + L.width + '" height="' + L.height +
           '" viewBox="0 0 ' + L.width + ' ' + L.height + '" role="img" aria-labelledby="chart-title chart-desc" font-family="' + FONT + '">');
    o.push('<desc id="chart-desc">Line chart of real-robot success rate (%) for eight methods on Peg, StackCube, CupCake and their average. ' +
           'TUCO (ours): 82.5, 75.0, 100.0, average 85.8. Full values are listed under "Show values" below the chart.</desc>');
    o.push('<rect x="0" y="0" width="' + L.width + '" height="' + L.height + '" fill="' + SURFACE + '"/>');

    // grid + y ticks
    [0, 25, 50, 75, 100].forEach(function (t) {
      var yy = L.y(t).toFixed(1);
      o.push('<line x1="' + L.m.left + '" x2="' + (L.m.left + L.pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + (t === 0 ? '#d9d6e0' : GRID) + '" stroke-width="1"/>');
      o.push('<text x="' + (L.m.left - 8) + '" y="' + yy + '" dy="0.35em" text-anchor="end" font-size="' + (L.fs - 0.5) + '" fill="' + MUTED + '">' + t + '%</text>');
    });
    // x labels
    CATS.forEach(function (c, i) {
      o.push('<text x="' + L.xs[i].toFixed(1) + '" y="' + (L.m.top + L.ph + 22) + '" text-anchor="middle" font-size="' + L.xfs + '" fill="' + INK2 + '"' +
             (c === 'Average' ? ' font-weight="600"' : '') + '>' + c + '</text>');
    });

    // series: references first, then methods, then TUCO on top
    var order = SERIES.filter(function (s) { return s.kind === 'ref'; })
      .concat(SERIES.filter(function (s) { return s.kind === 'method'; }))
      .concat(SERIES.filter(function (s) { return s.kind === 'ours'; }));
    order.forEach(function (s) {
      var pts = s.v.map(function (v, i) { return L.xs[i].toFixed(1) + ',' + L.y(v).toFixed(1); }).join(' ');
      var w = s.kind === 'ours' ? 3 : 2;
      o.push('<g class="series series-' + s.kind + '" data-name="' + esc(s.name) + '">');
      o.push('<polyline points="' + pts + '" fill="none" stroke="' + s.color + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"' +
             (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/>');
      var r = s.kind === 'ours' ? 5 : 4;
      s.v.forEach(function (v, i) {
        o.push('<circle cx="' + L.xs[i].toFixed(1) + '" cy="' + L.y(v).toFixed(1) + '" r="' + r + '" fill="' + s.color + '" stroke="' + SURFACE + '" stroke-width="2"/>');
      });
      o.push('</g>');
    });

    // TUCO value labels (the only series with values on the points)
    var tuco = SERIES[0];
    o.push('<g class="tuco-values">');
    tuco.v.forEach(function (v, i) {
      var t = '<text x="' + L.xs[i].toFixed(1) + '" y="' + (L.y(v) - 11).toFixed(1) + '" text-anchor="middle" font-size="' + L.fs + '" font-weight="700"';
      o.push(t + ' fill="' + SURFACE + '" stroke="' + SURFACE + '" stroke-width="4" stroke-linejoin="round" aria-hidden="true">' + fmt(v) + '</text>');  // halo
      o.push(t + ' fill="' + INK + '">' + fmt(v) + '</text>');
    });
    o.push('</g>');

    // direct end labels with leader lines
    var x3 = L.xs[3];
    placeEndLabels(L).forEach(function (it) {
      var s = it.s, ly = it.y;
      o.push('<g class="end-label" data-name="' + esc(s.name) + '">');
      o.push('<path d="M' + (x3 + 7).toFixed(1) + ' ' + it.target.toFixed(1) + ' L' + (x3 + 13).toFixed(1) + ' ' + it.target.toFixed(1) +
             ' L' + (x3 + 18).toFixed(1) + ' ' + ly.toFixed(1) + '" fill="none" stroke="' + s.color + '" stroke-width="1.5"' +
             (s.dash ? ' stroke-dasharray="2 2"' : '') + '/>');
      var y0 = ly - (it.lines.length - 1) * it.lh / 2;
      it.lines.forEach(function (line, k) {
        o.push('<text x="' + (x3 + 22).toFixed(1) + '" y="' + (y0 + k * it.lh).toFixed(1) + '" dy="0.35em" font-size="' + L.fs + '"' +
               (s.kind === 'ours' ? ' font-weight="700" fill="' + INK + '"' : ' fill="' + INK2 + '"') + '>' + esc(line) + '</text>');
      });
      o.push('</g>');
    });

    o.push('</svg>');
    return o.join('');
  }

  // Legend as SVG (used only for the offline PNG preview; the page uses an HTML legend).
  function legendKeySVG(s, x, y) {
    var r = s.kind === 'ours' ? 4.5 : 3.5;
    return '<line x1="' + x + '" x2="' + (x + 22) + '" y1="' + y + '" y2="' + y + '" stroke="' + s.color + '" stroke-width="' + (s.kind === 'ours' ? 3 : 2) + '"' +
      (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/><circle cx="' + (x + 11) + '" cy="' + y + '" r="' + r + '" fill="' + s.color + '" stroke="#fff" stroke-width="1.5"/>';
  }

  var api = { CATS: CATS, SERIES: SERIES, buildChartSVG: buildChartSVG, legendKeySVG: legendKeySVG, layout: layout, textW: textW, FONT: FONT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TucoChart = api;
})(this);
