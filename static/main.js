/* TUCO project page: figure lightbox, success-rate chart (rendering + tooltip), real-robot rollout grid playback and BibTeX copy button.
   Without JavaScript the page still works: figure links open the image directly. */
(function () {
  'use strict';

  // ---- lightbox ----
  var dlg = document.getElementById('lightbox');
  if (dlg && typeof dlg.showModal === 'function') {
    var big = dlg.querySelector('img');
    var full = dlg.querySelector('.lightbox-full');
    var links = document.querySelectorAll('a.zoom');
    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        var thumb = a.querySelector('img');
        big.src = a.getAttribute('href');
        big.alt = thumb ? thumb.alt : '';
        full.href = a.getAttribute('data-full') || a.getAttribute('href');
        var size = a.getAttribute('data-full-size');
        full.textContent = 'Full resolution' + (size ? ' (' + size + ')' : '');
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.lightbox-full')) return; // let the link open
      dlg.close();
    });
    dlg.addEventListener('close', function () { big.removeAttribute('src'); });
  }

  // ---- success-rate chart (drawn by chart.js; redrawn at the container width) ----
  var plot = document.querySelector('[data-chart]');
  if (plot && window.TucoChart) {
    var C = window.TucoChart;
    var tip = plot.querySelector('.chart-tip');
    var state = { width: 0, L: null, idx: -1 };

    // Draw-in animation (spec 2.7c): references, then the five curation methods, then TUCO (slower);
    // markers and labels of each line fade in when it completes. Runs once, about 2.3 s in total.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var anim = { pending: !reduce && 'IntersectionObserver' in window };
    var PHASE = { ref: [0, 500], method: [450, 700], ours: [1200, 1050] };  // [delay, duration] in ms
    var SVGNS = 'http://www.w3.org/2000/svg';
    var prepareAnim = function (svg, w) {
      var defs = document.createElementNS(SVGNS, 'defs');
      svg.insertBefore(defs, svg.firstChild);
      Array.prototype.forEach.call(svg.querySelectorAll('g.series'), function (g, k) {
        var line = g.querySelector('polyline');
        var len = Math.ceil(line.getTotalLength()) + 2;
        var mask = document.createElementNS(SVGNS, 'mask');
        mask.setAttribute('id', 'draw-' + k);
        mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('x', 0); mask.setAttribute('y', 0);
        mask.setAttribute('width', w); mask.setAttribute('height', svg.getAttribute('height'));
        var m = document.createElementNS(SVGNS, 'polyline');
        m.setAttribute('points', line.getAttribute('points'));
        m.setAttribute('fill', 'none'); m.setAttribute('stroke', '#fff'); m.setAttribute('stroke-width', '10');
        m.setAttribute('stroke-linejoin', 'round'); m.setAttribute('stroke-linecap', 'round');
        m.style.strokeDasharray = len; m.style.strokeDashoffset = len;
        mask.appendChild(m); defs.appendChild(mask);
        line.setAttribute('mask', 'url(#draw-' + k + ')');
        g._draw = m;
        Array.prototype.forEach.call(g.querySelectorAll('circle'), function (c) { c.style.opacity = 0; });
      });
      Array.prototype.forEach.call(svg.querySelectorAll('g.end-label, g.tuco-values'), function (n) { n.style.opacity = 0; });
    };
    var runAnim = function () {
      anim.pending = false;
      var svg = plot.querySelector('svg.chart-svg');
      if (!svg) return;
      var kindOf = function (g) { return g.classList.contains('series-ours') ? 'ours' : g.classList.contains('series-ref') ? 'ref' : 'method'; };
      var fade = function (n, at) { n.style.transition = 'opacity 250ms ease ' + at + 'ms'; n.style.opacity = 1; };
      // force the start state to be committed before transitions begin
      svg.getBoundingClientRect();
      requestAnimationFrame(function () {
        Array.prototype.forEach.call(svg.querySelectorAll('g.series'), function (g) {
          var ph = PHASE[kindOf(g)], end = ph[0] + ph[1];
          if (g._draw) {
            g._draw.style.transition = 'stroke-dashoffset ' + ph[1] + 'ms ' + (kindOf(g) === 'ours' ? 'cubic-bezier(.4,0,.2,1)' : 'ease-out') + ' ' + ph[0] + 'ms';
            g._draw.style.strokeDashoffset = 0;
          }
          Array.prototype.forEach.call(g.querySelectorAll('circle'), function (c) { fade(c, end - 100); });
          var lab = svg.querySelector('g.end-label[data-name="' + g.getAttribute('data-name').replace(/"/g, '\\"') + '"]');
          if (lab) fade(lab, end - 50);
          if (kindOf(g) === 'ours') { var tv = svg.querySelector('g.tuco-values'); if (tv) fade(tv, end - 50); }
        });
      });
    };
    var NARROW = 560;

    var keySVG = function (s) {
      return '<svg viewBox="0 0 16 8" aria-hidden="true"><line x1="0" x2="16" y1="4" y2="4" stroke="' + s.color + '" stroke-width="' +
        (s.kind === 'ours' ? 3 : 2) + '"' + (s.dash ? ' stroke-dasharray="' + (s.kind === 'ref' && s.dash === '2 3' ? '2 2' : '4 2') + '"' : '') + '/></svg>';
    };

    var render = function () {
      var w = Math.round(plot.clientWidth);
      if (!w || w === state.width) return;
      state.width = w;
      var opts = { narrow: w < NARROW };
      state.L = C.layout(w, opts);
      var old = plot.querySelector('svg.chart-svg');
      var holder = document.createElement('div');
      holder.innerHTML = C.buildChartSVG(w, opts);
      var svg = holder.firstChild;
      var cross = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      cross.setAttribute('class', 'crosshair');
      cross.setAttribute('y1', state.L.m.top); cross.setAttribute('y2', state.L.m.top + state.L.ph);
      cross.setAttribute('stroke', '#c9c5d2'); cross.setAttribute('stroke-width', '1');
      cross.style.display = 'none';
      svg.insertBefore(cross, svg.querySelector('g.series'));
      if (old) plot.replaceChild(svg, old); else plot.insertBefore(svg, tip);
      if (anim.pending) prepareAnim(svg, w);
      hide();
    };

    var show = function (i) {
      var L = state.L; if (!L) return;
      state.idx = i;
      var x = L.xs[i];
      var cross = plot.querySelector('.crosshair');
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.style.display = '';
      var rows = C.SERIES.slice().sort(function (a, b) { return b.v[i] - a.v[i]; });
      tip.innerHTML = '<div class="tip-head">' + C.CATS[i] + '</div>' + rows.map(function (s) {
        return '<div class="tip-row' + (s.kind === 'ours' ? ' tip-ours' : '') + '">' + keySVG(s) +
          '<span class="tip-name">' + s.name + '</span><span class="tip-val">' + s.v[i].toFixed(1) + '%</span></div>';
      }).join('');
      tip.hidden = false;
      var tw = tip.offsetWidth, scale = plot.clientWidth / L.width;
      var left = x * scale + 14;
      if (left + tw > plot.clientWidth) left = x * scale - 14 - tw;
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top = (L.m.top * scale) + 'px';
    };
    var hide = function () {
      state.idx = -1;
      tip.hidden = true;
      var cross = plot.querySelector('.crosshair');
      if (cross) cross.style.display = 'none';
    };
    var nearest = function (clientX) {
      var L = state.L, r = plot.getBoundingClientRect();
      var x = (clientX - r.left) * L.width / r.width, best = 0;
      L.xs.forEach(function (xx, i) { if (Math.abs(xx - x) < Math.abs(L.xs[best] - x)) best = i; });
      return best;
    };

    plot.addEventListener('pointermove', function (e) { if (state.L) show(nearest(e.clientX)); });
    plot.addEventListener('pointerdown', function (e) { if (state.L) show(nearest(e.clientX)); });
    plot.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
    plot.setAttribute('tabindex', '0');
    plot.addEventListener('focus', function () { show(state.idx < 0 ? C.CATS.length - 1 : state.idx); });
    plot.addEventListener('blur', hide);
    plot.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var n = C.CATS.length, i = state.idx < 0 ? n - 1 : state.idx;
        show((i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n);
      } else if (e.key === 'Escape') hide();
    });
    document.addEventListener('pointerdown', function (e) { if (!plot.contains(e.target)) hide(); });

    render();
    if (anim.pending) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); runAnim(); }
      }, { threshold: 0.35 });
      io.observe(plot);
    }
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(render, 120); });
  }

  // ---- real-robot rollout grid ----
  // Each clip plays on hover (mouse) or tap/click; the row button plays all clips of a row together.
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var play = function (v) {
    v.muted = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  };

  Array.prototype.forEach.call(document.querySelectorAll('.rollouts'), function (grid) {
    grid.classList.add('is-interactive');

    Array.prototype.forEach.call(grid.querySelectorAll('.rollout-row'), function (row) {
      var btn = row.querySelector('.row-play');
      var label = btn.querySelector('.row-play-text');
      var vids = Array.prototype.slice.call(row.querySelectorAll('video'));
      var live = function () { return vids; };

      var setRow = function (on) {
        row.classList.toggle('is-row-playing', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        label.textContent = on ? 'Pause row' : 'Play row';
      };
      var rowOn = function () { return row.classList.contains('is-row-playing'); };
      var syncButton = function () { btn.hidden = live().length === 0; };

      vids.forEach(function (v) {
        v.removeAttribute('controls');
        var media = v.parentNode;
        var clip = media.parentNode;

        media.setAttribute('role', 'button');
        media.setAttribute('tabindex', '0');
        media.setAttribute('aria-label', 'Play or pause: ' + (v.getAttribute('aria-label') || 'clip'));

        v.addEventListener('play', function () { clip.classList.add('is-playing'); });
        v.addEventListener('pause', function () {
          clip.classList.remove('is-playing');
          if (rowOn() && live().every(function (x) { return x.paused; })) setRow(false);
        });

        var toggle = function () { if (v.paused) play(v); else v.pause(); };
        media.addEventListener('click', toggle);
        media.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
        if (canHover) {
          media.addEventListener('mouseenter', function () { if (v.paused) play(v); });
          media.addEventListener('mouseleave', function () { if (!rowOn()) v.pause(); });
        }
      });

      syncButton();
      btn.addEventListener('click', function () {
        if (rowOn()) {
          live().forEach(function (v) { v.pause(); });
          setRow(false);
        } else {
          var vs = live();
          if (!vs.length) return;
          setRow(true);
          vs.forEach(function (v) {
            if (v.readyState > 0) { try { v.currentTime = 0; } catch (err) {} }
            play(v);
          });
        }
      });

      // stop clips that scroll out of view
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) { vids.forEach(function (v) { v.pause(); }); setRow(false); }
          });
        }, { threshold: 0 }).observe(row);
      }
    });
  });

  // ---- BibTeX copy ----
  var btn = document.querySelector('button.copy');
  if (btn && navigator.clipboard && window.isSecureContext) {
    var code = document.querySelector(btn.getAttribute('data-copy'));
    btn.hidden = false;
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(code.textContent).then(function () {
        btn.textContent = 'Copied';
        btn.classList.add('is-done');
        setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1600);
      });
    });
  }
})();
