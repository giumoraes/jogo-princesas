/* =============================================================================
 * COFRE DAS ENGRENAGENS CELESTIAIS  —  Quadro 2.3 / Nível 2  (Executor 12 / P5)
 * -----------------------------------------------------------------------------
 * Mecânica-assinatura do Nível 2 de "A Princesa e a Coroa Perdida".
 *
 * Componente ISOLADO e REUTILIZÁVEL. Sem build, sem npm, sem dependência de
 * CDN. Renderiza três anéis concêntricos em SVG e os gira por toque:
 *
 *   Anel A (externo) — 8 fases da lua .......... passo 45° (π/4),  140 ≤ r ≤ 195
 *   Anel B (médio)   — 6 constelações .......... passo 60° (π/3),   85 ≤ r < 140
 *   Anel C (centro)  — ponteiro do sol dourado . giro livre,             r < 85
 *
 * CONDIÇÃO DE VITÓRIA: Lua Cheia (slot 4 do Anel A) e Ursa Maior (slot 5 do
 * Anel B) alinhadas no topo (12h / 0°)  ->  dispara onSolved().
 *
 * API
 *   new CelestialVaultPuzzle(containerEl, {
 *     initialRotationA: 90,
 *     initialRotationB: 180,
 *     soundEnabled: true,
 *     onStateChange: (state) => {},   // {moonPhase:{name,index}, constellation:{name,index}}
 *     onSolved: (result) => {}        // {slotA, slotB, moonPhase, constellation}
 *   });
 *   .reset()     -> volta às rotações iniciais e destrava
 *   .destroy()   -> remove listeners e limpa o container
 *
 * Áudio: usa window.soundManager.playGearTick / playSnap / playUnlockVictory
 * (adicionados ao SoundManager consolidado em sound-manager.js). Se o
 * SoundManager não estiver presente, cai num sintetizador WebAudio interno
 * minúsculo — decisão registrada no relatório de P5.
 * ========================================================================== */

(function (global) {
  'use strict';

  // ------- Geometria (unidades de viewBox) -------------------------------------
  var VB = 460;            // lado do viewBox quadrado
  var C = VB / 2;          // centro (230, 230)
  var R_A = 168;           // raio dos ícones do Anel A (miolo da faixa 140–195)
  var R_B = 112;           // raio dos ícones do Anel B (miolo da faixa 85–140)
  var SVGNS = 'http://www.w3.org/2000/svg';

  // ------- Conteúdo dos anéis -------------------------------------------------
  var MOON_GLYPHS = ['🌑', '🌒', '🌓', '🌔',
                     '🌕', '🌖', '🌗', '🌘'];
  var MOON_NAMES = ['Lua Nova', 'Lua Crescente', 'Quarto Crescente', 'Gibosa Crescente',
                    'Lua Cheia', 'Gibosa Minguante', 'Quarto Minguante', 'Lua Minguante'];

  // Ordem TRAVADA pela especificação (fonte de verdade). NÃO reordenar.
  var CONST_NAMES = ['Órion', 'Cassiopeia', 'Pégaso', 'Cisne', 'Fênix', 'Ursa Maior'];

  // Desenho esquemático de cada constelação (coords locais ~ -21..21).
  var CONSTELLATIONS = [
    { // 0 Órion — cinturão de 3 estrelas + 4 cantos
      nodes: [[-15, -17], [13, -15], [-17, 15], [17, 17], [-6, -1], [0, 1], [6, 3]],
      edges: [[4, 5], [5, 6], [0, 4], [1, 6], [2, 4], [3, 6]]
    },
    { // 1 Cassiopeia — o "W"
      nodes: [[-19, 7], [-9, -10], [0, 7], [9, -10], [19, 7]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },
    { // 2 Pégaso — o Grande Quadrado
      nodes: [[-13, -13], [13, -13], [13, 13], [-13, 13]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0]]
    },
    { // 3 Cisne — a Cruz do Norte
      nodes: [[0, -19], [0, 15], [-15, 0], [15, 0], [0, 0]],
      edges: [[0, 4], [4, 1], [2, 4], [4, 3]]
    },
    { // 4 Fênix — ave alçando voo
      nodes: [[0, -17], [-17, -3], [-7, -7], [7, -7], [17, -3], [0, 13]],
      edges: [[0, 2], [0, 3], [2, 1], [3, 4], [0, 5]]
    },
    { // 5 Ursa Maior — o Grande Carro (Big Dipper), 7 estrelas
      nodes: [[-18, 9], [-6, 11], [-4, -2], [-17, -2], [5, -5], [13, -11], [21, -9]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [5, 6]]
    }
  ];

  // ------- Ease-Out-Back (parâmetros exatos da especificação) ---------------
  var EB_C1 = 1.70158;
  var EB_C3 = EB_C1 + 1;
  function easeOutBack(t) {
    return 1 + EB_C3 * Math.pow(t - 1, 3) + EB_C1 * Math.pow(t - 1, 2);
  }

  function mod(n, m) { return ((n % m) + m) % m; }

  function svgEl(name, attrs) {
    var node = document.createElementNS(SVGNS, name);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    return node;
  }

  // =========================================================================
  //  CLASSE
  // =========================================================================
  function CelestialVaultPuzzle(container, options) {
    if (!container) throw new Error('CelestialVaultPuzzle: elemento container é obrigatório.');

    this.container = container;
    this.opts = Object.assign({
      initialRotationA: 90,
      initialRotationB: 180,
      soundEnabled: true,
      onStateChange: function () {},
      onSolved: function () {}
    }, options || {});

    this.angleA = this.opts.initialRotationA;   // graus acumulados (giro contínuo)
    this.angleB = this.opts.initialRotationB;
    this.angleC = 0;                            // ponteiro do sol (giro livre)

    this.dragging = false;
    this.activeRing = null;                     // 'A' | 'B' | null
    this.lastTheta = 0;
    this.lastTickAngle = 0;
    this.solved = false;

    this._raf = 0;
    this._animRing = null;
    this._spinLog = [];
    this._lastFreneticAt = 0;
    this._lastMicroAt = 0;

    this._buildAudio();
    this._buildDom();
    this._bindEvents();
    this._applyTransforms();
    this._emitState();
  }

  // ------- Áudio -----------------------------------------------------------
  CelestialVaultPuzzle.prototype._buildAudio = function () {
    var self = this;
    var sm = (typeof window !== 'undefined') ? window.soundManager : null;
    var hasSM = !!(sm &&
      typeof sm.playGearTick === 'function' &&
      typeof sm.playSnap === 'function' &&
      typeof sm.playUnlockVictory === 'function');

    this._audioSource = hasSM ? 'window.soundManager (SoundManager consolidado)' : 'sintetizador interno (fallback)';

    if (hasSM) {
      this.audio = {
        tick: function () { if (self.opts.soundEnabled) try { sm.playGearTick(); } catch (e) {} },
        snap: function () { if (self.opts.soundEnabled) try { sm.playSnap(); } catch (e) {} },
        victory: function () { if (self.opts.soundEnabled) try { sm.playUnlockVictory(); } catch (e) {} }
      };
      return;
    }

    // Fallback autônomo: só entra em ação se não houver SoundManager no projeto.
    var actx = null;
    function ac() {
      if (actx) return actx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      return actx;
    }
    function blip(freq, dur, type, vol) {
      if (!self.opts.soundEnabled) return;
      var a = ac();
      if (!a) return;
      if (a.state === 'suspended') a.resume().catch(function () {});
      var t = a.currentTime;
      var o = a.createOscillator();
      var g = a.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol || 0.12, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + dur + 0.03);
    }
    this.audio = {
      tick: function () { blip(860 + Math.random() * 140, 0.05, 'square', 0.05); },
      snap: function () { blip(190, 0.16, 'triangle', 0.22); blip(1280, 0.1, 'sine', 0.06); },
      victory: function () {
        [523.25, 659.25, 783.99, 1046.5, 1174.66].forEach(function (f, i) {
          setTimeout(function () { blip(f, 1.0, 'sine', 0.18); }, i * 70);
        });
      }
    };
  };

  // ------- DOM / SVG -----------------------------------------------------
  CelestialVaultPuzzle.prototype._buildDom = function () {
    this.container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'cv-root';
    root.style.touchAction = 'none';   // ARMADILHA: trava a rolagem da página no gesto de girar
    this.root = root;

    var svg = svgEl('svg', {
      'class': 'cv-svg',
      viewBox: '0 0 ' + VB + ' ' + VB,
      role: 'group',
      'aria-label': 'Cofre das Engrenagens Celestiais. Gire os anéis para alinhar a Lua Cheia e a Ursa Maior no topo.'
    });
    this.svg = svg;

    // defs — gradiente do sol
    var defs = svgEl('defs');
    var grad = svgEl('radialGradient', { id: 'cvSunGrad', cx: '38%', cy: '34%', r: '72%' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#fff6d8' }));
    grad.appendChild(svgEl('stop', { offset: '55%', 'stop-color': '#ffd873' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#e59a1e' }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Bisel e aros-guia
    svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 214, fill: '#241246', stroke: '#0f0722', 'stroke-width': 6 }));
    svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 206, fill: 'none', stroke: '#6c4bb0', 'stroke-width': 2, 'stroke-dasharray': '2 6', opacity: 0.55 }));
    svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 140, fill: 'none', stroke: '#5b3fa0', 'stroke-width': 2, opacity: 0.7 }));
    svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 85, fill: 'none', stroke: '#5b3fa0', 'stroke-width': 2, opacity: 0.7 }));

    // Halo de vitória
    svg.appendChild(svgEl('circle', { 'class': 'cv-halo', cx: C, cy: C, r: 70, fill: 'none', stroke: '#ffd873', 'stroke-width': 4, opacity: 0 }));

    // ---- Anel A (fases da lua) ----
    var ringA = svgEl('g', { 'class': 'cv-ring cv-ring-a' });
    ringA.appendChild(svgEl('circle', { 'class': 'cv-ring-plate', cx: C, cy: C, r: R_A + 22, fill: 'rgba(124,87,200,0.10)', stroke: '#7d57c8', 'stroke-width': 1 }));
    for (var i = 0; i < 8; i++) {
      var slotA = svgEl('g', { transform: 'rotate(' + (i * 45) + ' ' + C + ' ' + C + ')' });
      var moon = svgEl('text', { 'class': 'cv-moon-glyph', x: C, y: C - R_A });
      moon.textContent = MOON_GLYPHS[i];
      slotA.appendChild(moon);
      var mLbl = svgEl('text', { 'class': 'cv-slot-label', x: C, y: C - R_A + 30 });
      mLbl.textContent = MOON_NAMES[i];
      slotA.appendChild(mLbl);
      ringA.appendChild(slotA);
    }
    this.ringAEl = ringA;
    svg.appendChild(ringA);

    // ---- Anel B (constelações) ----
    var ringB = svgEl('g', { 'class': 'cv-ring cv-ring-b' });
    ringB.appendChild(svgEl('circle', { 'class': 'cv-ring-plate', cx: C, cy: C, r: R_B + 18, fill: 'rgba(90,60,170,0.16)', stroke: '#6b49bd', 'stroke-width': 1 }));
    for (var j = 0; j < 6; j++) {
      var slotB = svgEl('g', { transform: 'rotate(' + (j * 60) + ' ' + C + ' ' + C + ')' });
      var inner = svgEl('g', { transform: 'translate(' + C + ' ' + (C - R_B) + ')' });
      var pat = CONSTELLATIONS[j];
      for (var e = 0; e < pat.edges.length; e++) {
        var a = pat.nodes[pat.edges[e][0]];
        var b = pat.nodes[pat.edges[e][1]];
        inner.appendChild(svgEl('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#bfa8ff', 'stroke-width': 1.4, opacity: 0.7 }));
      }
      for (var n = 0; n < pat.nodes.length; n++) {
        inner.appendChild(svgEl('circle', { cx: pat.nodes[n][0], cy: pat.nodes[n][1], r: 2.6, fill: '#fff4c2' }));
      }
      var cLbl = svgEl('text', { 'class': 'cv-slot-label', x: 0, y: 32 });
      cLbl.textContent = CONST_NAMES[j];
      inner.appendChild(cLbl);
      slotB.appendChild(inner);
      ringB.appendChild(slotB);
    }
    this.ringBEl = ringB;
    svg.appendChild(ringB);

    // ---- Anel C (ponteiro do sol dourado) ----
    var ringC = svgEl('g', { 'class': 'cv-ring cv-ring-c' });
    var sun = svgEl('g', { transform: 'translate(' + C + ' ' + C + ')' });
    for (var k = 0; k < 12; k++) {
      sun.appendChild(svgEl('path', { 'class': 'cv-sun-ray', d: 'M 0 -34 L 6 -50 L -6 -50 Z', transform: 'rotate(' + (k * 30) + ')' }));
    }
    sun.appendChild(svgEl('circle', { 'class': 'cv-sun-disc', cx: 0, cy: 0, r: 34 }));
    sun.appendChild(svgEl('circle', { 'class': 'cv-sun-face', cx: -11, cy: -6, r: 3 }));
    sun.appendChild(svgEl('circle', { 'class': 'cv-sun-face', cx: 11, cy: -6, r: 3 }));
    var smile = svgEl('path', { d: 'M -12 7 Q 0 19 12 7' });
    smile.setAttribute('style', 'fill:none;stroke:#7a5b12;stroke-width:3;stroke-linecap:round');
    sun.appendChild(smile);
    ringC.appendChild(sun);
    this.ringCEl = ringC;
    svg.appendChild(ringC);

    // Marcador do topo (12h / 0°) — referência da validação
    svg.appendChild(svgEl('path', { 'class': 'cv-top-marker', d: 'M ' + C + ' ' + (C - 190) + ' l -13 -22 l 26 0 z' }));
    svg.appendChild(svgEl('circle', { 'class': 'cv-top-marker-glow', cx: C, cy: C - 214, r: 10 }));

    root.appendChild(svg);

    // Camada de partículas (DOM puro — mantém o componente autocontido)
    this.particleLayer = document.createElement('div');
    this.particleLayer.className = 'cv-particles';
    root.appendChild(this.particleLayer);

    this.container.appendChild(root);
  };

  // ------- Eventos --------------------------------------------------------
  CelestialVaultPuzzle.prototype._bindEvents = function () {
    var self = this;
    this._onDown = function (ev) { self._pointerDown(ev); };
    this._onMove = function (ev) { self._pointerMove(ev); };
    this._onUp = function (ev) { self._pointerUp(ev); };
    this.svg.addEventListener('pointerdown', this._onDown);
    this.svg.addEventListener('pointermove', this._onMove);
    this.svg.addEventListener('pointerup', this._onUp);
    this.svg.addEventListener('pointercancel', this._onUp);
  };

  // Coordenadas polares relativas ao centro do puzzle.
  // ARMADILHA: o `scale` do SVG entra na fórmula  ->  r = hypot(dx,dy) / scale
  CelestialVaultPuzzle.prototype._polar = function (ev) {
    var rect = this.svg.getBoundingClientRect();
    var scale = rect.width / VB;
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = ev.clientX - cx;
    var dy = ev.clientY - cy;
    return {
      r: Math.hypot(dx, dy) / scale,
      theta: Math.atan2(dy, dx)
    };
  };

  CelestialVaultPuzzle.prototype._pointerDown = function (ev) {
    if (this.solved) return;
    var p = this._polar(ev);

    var ring = null;
    if (p.r >= 140 && p.r <= 200) ring = 'A';
    else if (p.r >= 85 && p.r < 140) ring = 'B';
    else if (p.r < 85) ring = 'C';   // giro livre reservado à celebração — ignorado no toque

    if (ring !== 'A' && ring !== 'B') return;
    if (this._raf && this._animRing === ring) return;   // não sequestra um anel em pleno snap

    this.activeRing = ring;
    this.dragging = true;
    this.lastTheta = p.theta;
    this.lastTickAngle = (ring === 'A') ? this.angleA : this.angleB;
    this._spinLog.length = 0;

    try { this.svg.setPointerCapture(ev.pointerId); } catch (err) {}   // dedo pode sair da área sem travar
    this.root.classList.add('cv-dragging');
    (ring === 'A' ? this.ringAEl : this.ringBEl).classList.add('cv-active');
    ev.preventDefault();
  };

  CelestialVaultPuzzle.prototype._pointerMove = function (ev) {
    if (!this.dragging || !this.activeRing) return;

    var p = this._polar(ev);
    var dTheta = p.theta - this.lastTheta;

    // NORMALIZAÇÃO OBRIGATÓRIA em [-π, π]: sem isto há salto de 360° quando o
    // dedo cruza o eixo (−x), o bug clássico deste tipo de puzzle.
    if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    this.lastTheta = p.theta;

    var dDeg = dTheta * (180 / Math.PI);
    if (this.activeRing === 'A') this.angleA += dDeg;
    else this.angleB += dDeg;

    this._applyTransforms();
    this._emitState();

    // Tique de engrenagem a cada ~detente percorrido.
    var cur = (this.activeRing === 'A') ? this.angleA : this.angleB;
    var tickStep = (this.activeRing === 'A') ? 15 : 20;
    if (Math.abs(cur - this.lastTickAngle) >= tickStep) {
      this.audio.tick();
      this.lastTickAngle = cur;
    }

    this._trackFrenetic(Math.abs(dDeg));
    ev.preventDefault();
  };

  CelestialVaultPuzzle.prototype._pointerUp = function (ev) {
    if (!this.dragging) return;
    this.dragging = false;
    this.root.classList.remove('cv-dragging');
    try { this.svg.releasePointerCapture(ev.pointerId); } catch (err) {}

    var ring = this.activeRing;
    this.activeRing = null;
    this.ringAEl.classList.remove('cv-active');
    this.ringBEl.classList.remove('cv-active');
    if (!ring) return;

    // Snap magnético ao detente mais próximo.
    var step = (ring === 'A') ? 45 : 60;
    var from = (ring === 'A') ? this.angleA : this.angleB;
    var target = Math.round(from / step) * step;
    this._animateSnap(ring, from, target);
  };

  // ------- Snap (interpolação Ease-Out-Back) ---------------------------
  CelestialVaultPuzzle.prototype._animateSnap = function (ring, from, target) {
    var self = this;
    var dur = 340;
    var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    if (this._raf) cancelAnimationFrame(this._raf);
    this._animRing = ring;

    function frame(now) {
      var t = (now - t0) / dur;
      if (t > 1) t = 1;
      var v = from + (target - from) * easeOutBack(t);
      if (ring === 'A') self.angleA = v; else self.angleB = v;
      self._applyTransforms();

      if (t < 1) {
        self._raf = requestAnimationFrame(frame);
        return;
      }
      if (ring === 'A') self.angleA = target; else self.angleB = target;
      self._applyTransforms();
      self._raf = 0;
      self._animRing = null;
      self.audio.snap();
      self._emitState();
      self._checkSolved();
    }

    this._raf = requestAnimationFrame(frame);
  };

  CelestialVaultPuzzle.prototype._applyTransforms = function () {
    this.ringAEl.setAttribute('transform', 'rotate(' + this.angleA + ' ' + C + ' ' + C + ')');
    this.ringBEl.setAttribute('transform', 'rotate(' + this.angleB + ' ' + C + ' ' + C + ')');
    if (!this.solved) {
      this.ringCEl.setAttribute('transform', 'rotate(' + this.angleC + ' ' + C + ' ' + C + ')');
    }
  };

  // ------- Validação no topo (12h / 0°) --------------------------------
  CelestialVaultPuzzle.prototype._readSlots = function () {
    return {
      slotA: mod(-Math.round(this.angleA / 45), 8),
      slotB: mod(-Math.round(this.angleB / 60), 6)
    };
  };

  CelestialVaultPuzzle.prototype._emitState = function () {
    var s = this._readSlots();
    try {
      this.opts.onStateChange({
        moonPhase: { index: s.slotA, name: MOON_NAMES[s.slotA], glyph: MOON_GLYPHS[s.slotA] },
        constellation: { index: s.slotB, name: CONST_NAMES[s.slotB] },
        solved: this.solved
      });
    } catch (err) {
      // O callback do consumidor jamais pode derrubar o puzzle.
    }
  };

  CelestialVaultPuzzle.prototype._checkSolved = function () {
    if (this.solved) return;
    var s = this._readSlots();

    if (s.slotA === 4 && s.slotB === 5) {   // Lua Cheia + Ursa Maior
      this._solve(s);
      return;
    }

    // Micro-reações a erro (flavor opcional do roteiro).
    var now = Date.now();
    if (now - this._lastMicroAt < 900) return;
    if (s.slotA === 0) {                     // Lua Nova no topo
      this._lastMicroAt = now;
      this._microReaction('moon-new');
    } else if (s.slotB === 4) {              // Fênix (a constelação "fera") no topo
      this._lastMicroAt = now;
      this._microReaction('const-beast');
    }
  };

  CelestialVaultPuzzle.prototype._microReaction = function (kind) {
    var table = {
      'moon-new': {
        owl: 'Uhuu-uhuu!',
        line: 'Boa noite pra você também, senhorita coruja! Mas eu preciso da lua bem acordada e brilhante para o baile de hoje!'
      },
      'const-beast': {
        line: 'Brrr! Que bafinho gelado de dragão! Acho melhor chamar uma constelação mais dócil...'
      },
      'frenetic': {
        line: 'Devagar com o andor, Aurora, que os astrônomos do castelo não tinham pressa!'
      }
    };
    var msg = table[kind];
    if (!msg) return;
    try {
      this.opts.onStateChange({
        microReaction: kind,
        message: msg.line,
        owl: msg.owl || null
      });
    } catch (err) {}
  };

  CelestialVaultPuzzle.prototype._trackFrenetic = function (absDeg) {
    var now = Date.now();
    this._spinLog.push({ t: now, d: absDeg });
    while (this._spinLog.length && now - this._spinLog[0].t > 380) this._spinLog.shift();

    var sum = 0;
    for (var i = 0; i < this._spinLog.length; i++) sum += this._spinLog[i].d;

    if (sum > 720 && now - this._lastFreneticAt > 4000) {
      this._lastFreneticAt = now;
      var self = this;
      this.root.classList.add('cv-dizzy');
      setTimeout(function () { self.root.classList.remove('cv-dizzy'); }, 1100);
      this._microReaction('frenetic');
    }
  };

  // ------- Destravamento -------------------------------------------------
  CelestialVaultPuzzle.prototype._solve = function (s) {
    if (this.solved) return;
    this.solved = true;
    this.dragging = false;
    this.activeRing = null;
    this.angleC = 0;

    this.root.classList.add('cv-solved');   // CSS: giro de celebração do sol + pulso do halo
    this._burstParticles(34);
    this.audio.victory();

    var self = this;
    setTimeout(function () {
      try {
        self.opts.onSolved({
          slotA: s.slotA,
          slotB: s.slotB,
          moonPhase: MOON_NAMES[s.slotA],
          constellation: CONST_NAMES[s.slotB]
        });
      } catch (err) {
        console.error('[CelestialVaultPuzzle] onSolved lançou erro:', err);
      }
    }, 900);
  };

  CelestialVaultPuzzle.prototype._burstParticles = function (count) {
    var layer = this.particleLayer;
    if (!layer) return;
    for (var i = 0; i < count; i++) {
      var pcl = document.createElement('span');
      pcl.className = 'cv-particle';
      var ang = Math.random() * Math.PI * 2;
      var dist = 60 + Math.random() * 150;
      var dur = 700 + Math.random() * 700;
      pcl.style.setProperty('--cv-dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      pcl.style.setProperty('--cv-dy', (Math.sin(ang) * dist).toFixed(1) + 'px');
      pcl.style.setProperty('--cv-dur', dur.toFixed(0) + 'ms');
      var hue = Math.random() < 0.5 ? '#ffd873' : '#ff9ae0';
      pcl.style.background = 'radial-gradient(circle at 30% 30%, #fff, ' + hue + ' 60%, rgba(255,255,255,0) 100%)';
      layer.appendChild(pcl);
      (function (node, life) {
        requestAnimationFrame(function () { node.classList.add('cv-p-run'); });
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, life + 140);
      })(pcl, dur);
    }
  };

  // ------- API pública -------------------------------------------------
  CelestialVaultPuzzle.prototype.reset = function () {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
    this._animRing = null;
    this.solved = false;
    this.dragging = false;
    this.activeRing = null;
    this.angleA = this.opts.initialRotationA;
    this.angleB = this.opts.initialRotationB;
    this.angleC = 0;
    this._spinLog.length = 0;
    this._lastFreneticAt = 0;
    this._lastMicroAt = 0;

    this.root.classList.remove('cv-solved', 'cv-dizzy', 'cv-dragging');
    this.ringAEl.classList.remove('cv-active');
    this.ringBEl.classList.remove('cv-active');
    if (this.particleLayer) this.particleLayer.innerHTML = '';

    this._applyTransforms();
    this._emitState();
  };

  CelestialVaultPuzzle.prototype.destroy = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.svg) {
      this.svg.removeEventListener('pointerdown', this._onDown);
      this.svg.removeEventListener('pointermove', this._onMove);
      this.svg.removeEventListener('pointerup', this._onUp);
      this.svg.removeEventListener('pointercancel', this._onUp);
    }
    this.container.innerHTML = '';
  };

  CelestialVaultPuzzle.prototype.getAudioSource = function () { return this._audioSource; };

  // ------- Exposição (sem bundler: global + CommonJS opcional) --------
  global.CelestialVaultPuzzle = CelestialVaultPuzzle;
  if (typeof module !== 'undefined' && module.exports) module.exports = CelestialVaultPuzzle;

})(typeof window !== 'undefined' ? window : this);
