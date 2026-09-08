// ===================================================
// A PRINCESA E A COROA PERDIDA - LÓGICA DO JOGO HQ
// Filosofia Zero-Button UI, PointerEvents & Narrativa
// Suporte a Nível 1 & Nível 2 com Assets Ilustrados
// ===================================================

document.addEventListener('DOMContentLoaded', () => {
  // ELEMENTOS DO DOM
  const scrollContainer = document.getElementById('comic-scroll-container');
  const panels = [
    document.getElementById('panel-1'),
    document.getElementById('panel-2'),
    document.getElementById('panel-3'),
    document.getElementById('panel-4'),
    document.getElementById('panel-5'),
    document.getElementById('panel-6')
  ];

  const soundBtn = document.getElementById('sound-btn');

  // Quadro 1: O Despertar
  const bedInteractive = document.getElementById('bed-interactive');
  const princessQ1Standing = document.getElementById('princess-q1-standing');
  const bubbleQ1 = document.getElementById('bubble-q1');
  const catQ1 = document.getElementById('cat-q1');

  // Quadro 2: O Guarda-Roupa
  const bubbleQ2 = document.getElementById('bubble-q2');
  const dressItems = document.querySelectorAll('.dress-item');
  const dropTargetPrincess = document.getElementById('drop-target-princess');
  const dropHalo = document.getElementById('drop-halo');
  const princessQ2Pajamas = document.getElementById('princess-q2-pajamas');
  const princessQ2Dressed = document.getElementById('princess-q2-dressed');

  // Quadro 3: A Penteadeira
  const bubbleQ3 = document.getElementById('bubble-q3');
  const pillowTarget = document.getElementById('pillow-target');
  const hiddenKey = document.getElementById('hidden-key');
  const clueScroll = document.getElementById('clue-scroll');
  const shapeMatchLayer = document.getElementById('shape-match-layer');
  const carvingSlots = document.querySelectorAll('#shape-match-layer .carving-slot');
  const gemItems = document.querySelectorAll('#shape-match-layer .gem-draggable');
  const vanityDrawerBox = document.getElementById('vanity-drawer-box');

  // Quadro 4: Nível 2 - O Portal dos Três Astros
  const bubbleQ4 = document.getElementById('bubble-q4');
  const owlInteractive = document.getElementById('owl-interactive');
  const owlHint = document.getElementById('owl-hint');
  const keyDraggables = document.querySelectorAll('.key-draggable-item');
  const portalLockTarget = document.getElementById('portal-lock-target');

  // Quadro 2.2 (P4): A Sala das Relíquias - Estante da Criação
  const bubbleQ5 = document.getElementById('bubble-q5');
  const creationBookcase = document.getElementById('creation-bookcase');
  const altarReveal = document.querySelector('#panel-5 .relic-altar-reveal');
  const tomeItems = document.querySelectorAll('#panel-5 .tome-item');
  const bookNiches = document.querySelectorAll('#panel-5 .book-niche');

  // Quadro 5: Epílogo
  const royalSealReplay = document.getElementById('royal-seal-replay');

  // Canvas de Partículas
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');

  // ESTADO DO JOGO
  let currentPanelIndex = 0;
  let q1Awake = false;
  let q2Dressed = false;
  let q3PillowMoved = false;
  let q3KeyUnlocked = false;
  let q3ShapesMatched = 0;
  let q3ShapeMatchDone = false;
  let q4PortalUnlocked = false;
  let q5RelicsSolved = false;

  let idleTimer = null;
  let ghostHandTimer = null;
  let ghostHandLoop = null;
  let activeWiggleElement = null;
  let activeGhostHand = null;

  // Feedback tátil (P2): raio de snap magnético em px (90-110 conforme spec de usabilidade)
  const SNAP_RADIUS = 110;

  // ===================================================
  // SISTEMA DE PARTÍCULAS (SPARKLES, STARS & HEARTS)
  // ===================================================
  let particles = [];

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  class SparkleParticle {
    constructor(x, y, type = 'star') {
      this.x = x;
      this.y = y;
      this.type = type;
      this.size = Math.random() * 14 + 8;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 1.5;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 1.8;
      this.alpha = 1;
      this.decay = Math.random() * 0.02 + 0.015;
      this.rotation = Math.random() * Math.PI;
      this.rotSpeed = (Math.random() - 0.5) * 0.15;
      
      const colors = ['#ffd700', '#ff6b97', '#ffb84d', '#c084fc', '#ffffff', '#38bdf8'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.07;
      this.alpha -= this.decay;
      this.rotation += this.rotSpeed;
    }

    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;

      if (this.type === 'heart') {
        const s = this.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(-s, -s * 0.6, -s * 1.3, s * 0.4, 0, s * 1.2);
        ctx.bezierCurveTo(s * 1.3, s * 0.4, s, -s * 0.6, 0, s * 0.3);
        ctx.fill();
      } else {
        const s = this.size;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function spawnParticles(x, y, count = 25, type = 'star') {
    for (let i = 0; i < count; i++) {
      particles.push(new SparkleParticle(x, y, Math.random() > 0.4 ? type : 'heart'));
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
    requestAnimationFrame(animateParticles);
  }
  requestAnimationFrame(animateParticles);

  // ===================================================
  // ONOMATOPEIAS VISUAIS DINÂMICAS (GIBI)
  // ===================================================
  function showOnomatopoeia(text, x, y, panel) {
    const el = document.createElement('div');
    el.className = 'onomatopoeia';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    panel.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, 850);
  }

  // ===================================================
  // GERENCIAMENTO DE TRANSIÇÃO ENTRE QUADROS
  // ===================================================
  function scrollToPanel(index) {
    if (index >= panels.length) return;
    currentPanelIndex = index;
    const targetPanel = panels[index];
    targetPanel.style.display = 'flex';

    panels.forEach((p, idx) => {
      if (idx === index) {
        p.classList.add('active-panel');
      } else {
        p.classList.remove('active-panel');
      }
    });

    targetPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.soundManager.playWhoosh();
    resetIdleTimer();
  }

  // ===================================================
  // AJUDA TÁTIL ORGÂNICA (P2)
  //  - Idle Wiggle aos 3,5s de inatividade
  //  - Ghost Finger Trail (mãozinha fantasma) aos 7,0s, repetindo a cada ~4s
  //    enquanto o quadro ativo não for resolvido.
  // ===================================================

  // Item que deve receber a dica no quadro/estado atual (ou null se resolvido).
  // `target` != null => há um alvo de drop para a mão deslizar; null => toque puro (só pulsa).
  function getIdleHintTargets() {
    if (currentPanelIndex === 0 && !q1Awake) {
      return { source: bedInteractive, target: null };
    }
    if (currentPanelIndex === 1 && !q2Dressed) {
      return { source: document.getElementById('dress-pink'), target: dropTargetPrincess };
    }
    if (currentPanelIndex === 2 && !q3PillowMoved) {
      return { source: pillowTarget, target: null };
    }
    if (currentPanelIndex === 2 && q3PillowMoved && !q3KeyUnlocked) {
      return { source: hiddenKey, target: null };
    }
    if (currentPanelIndex === 2 && q3KeyUnlocked && !q3ShapeMatchDone) {
      const g = firstUnmatchedGem();
      return g ? { source: g, target: slotForShape(g.dataset.shape) } : null;
    }
    if (currentPanelIndex === 3 && !q4PortalUnlocked) {
      return { source: document.getElementById('key-moon'), target: portalLockTarget };
    }
    if (currentPanelIndex === 4 && !q5RelicsSolved) {
      const tome = firstTableTome();
      const niche = firstEmptyNiche();
      if (tome && niche) return { source: tome, target: niche };
    }
    return null;
  }

  function clearGhostHand() {
    if (ghostHandTimer) { clearTimeout(ghostHandTimer); ghostHandTimer = null; }
    if (ghostHandLoop) { clearInterval(ghostHandLoop); ghostHandLoop = null; }
    if (activeGhostHand && activeGhostHand.parentNode) activeGhostHand.remove();
    activeGhostHand = null;
  }

  function playGhostHandOnce() {
    const hint = getIdleHintTargets();
    if (!hint || !hint.source) { clearGhostHand(); return; }

    const panel = panels[currentPanelIndex];
    if (!panel) return;

    if (activeGhostHand && activeGhostHand.parentNode) activeGhostHand.remove();

    const panelRect = panel.getBoundingClientRect();
    const srcRect = hint.source.getBoundingClientRect();
    const x0 = srcRect.left + srcRect.width / 2 - panelRect.left;
    const y0 = srcRect.top + srcRect.height / 2 - panelRect.top;

    const hand = document.createElement('div');
    hand.className = 'ghost-hand';
    hand.textContent = '👆';
    hand.style.setProperty('--gh-x0', x0 + 'px');
    hand.style.setProperty('--gh-y0', y0 + 'px');

    if (hint.target) {
      const tgtRect = hint.target.getBoundingClientRect();
      const x1 = tgtRect.left + tgtRect.width / 2 - panelRect.left;
      const y1 = tgtRect.top + tgtRect.height / 2 - panelRect.top;
      hand.style.setProperty('--gh-x1', x1 + 'px');
      hand.style.setProperty('--gh-y1', y1 + 'px');
      hand.classList.add('gh-slide');
    } else {
      hand.classList.add('gh-pulse');
    }

    hand.addEventListener('animationend', () => {
      if (hand.parentNode) hand.remove();
      if (activeGhostHand === hand) activeGhostHand = null;
    });

    panel.appendChild(hand);
    activeGhostHand = hand;
  }

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (activeWiggleElement) {
      activeWiggleElement.classList.remove('idle-wiggle');
      activeWiggleElement = null;
    }
    clearGhostHand();

    idleTimer = setTimeout(triggerIdleHelp, 3500);
    ghostHandTimer = setTimeout(() => {
      playGhostHandOnce();
      ghostHandLoop = setInterval(playGhostHandOnce, 4000);
    }, 7000);
  }

  function triggerIdleHelp() {
    const hint = getIdleHintTargets();
    if (!hint || !hint.source) return;
    activeWiggleElement = hint.source;
    hint.source.classList.add('idle-wiggle');
  }

  window.addEventListener('pointerdown', () => {
    resetIdleTimer();
  });

  // ===================================================
  // LIFT & SCALE UNIVERSAL + GEOMETRIA DO SNAP MAGNÉTICO (P2)
  // ===================================================

  // Detecta o objeto de áudio disponível (Executor 8 pode tê-lo renomeado).
  function getAudio() {
    return window.soundManager || window.comicAudio || null;
  }

  function playPopSfx(pitch) {
    const audio = getAudio();
    if (audio && typeof audio.playPop === 'function') {
      try { audio.playPop(pitch); } catch (e) {}
    }
  }

  // Cresce ~15% + sombra + som de "pop". Reverter no pointerup/pointercancel/timeout.
  function applyTouchLift(el) {
    if (!el) return;
    el.classList.add('touch-lift');
    if (el._liftTimeout) clearTimeout(el._liftTimeout);
    el._liftTimeout = setTimeout(() => releaseTouchLift(el), 3000);
    playPopSfx(1.15);
  }

  function releaseTouchLift(el) {
    if (!el) return;
    if (el._liftTimeout) { clearTimeout(el._liftTimeout); el._liftTimeout = null; }
    el.classList.remove('touch-lift');
  }

  function rectCenter(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function euclidDist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // Fração da área de r1 coberta pela interseção com r2 (0..1).
  function overlapRatio(r1, r2) {
    const xo = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
    const yo = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
    const area = r1.width * r1.height;
    return area > 0 ? (xo * yo) / area : 0;
  }

  // Curva Ease-Out-Back conforme spec (c1 = 1.70158).
  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // Anima o item arrastado até o centro exato do alvo com Ease-Out-Back.
  function snapItemToCenter(item, targetEl, startDx, startDy, duration, onDone) {
    const ic = rectCenter(item.getBoundingClientRect());
    const tc = rectCenter(targetEl.getBoundingClientRect());
    const endDx = startDx + (tc.x - ic.x);
    const endDy = startDy + (tc.y - ic.y);
    const t0 = performance.now();

    function frame(now) {
      let p = (now - t0) / duration;
      if (p > 1) p = 1;
      const e = easeOutBack(p);
      const x = startDx + (endDx - startDx) * e;
      const y = startDy + (endDy - startDy) * e;
      const s = 1.15 + (1 - 1.15) * p;
      item.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(0deg)`;
      if (p < 1) {
        requestAnimationFrame(frame);
      } else if (typeof onDone === 'function') {
        onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  // ===================================================
  // AUTOPLAY & TRILHA AMBIENTE NO PRIMEIRO GESTO
  // ===================================================
  const startAmbientOnFirstGesture = () => {
    if (window.soundManager) {
      window.soundManager.init();
      if (window.soundManager.ctx && window.soundManager.ctx.state === 'suspended') {
        window.soundManager.ctx.resume().then(() => {
          if (!window.soundManager.ambientState.isPlaying) {
            window.soundManager.startCozyAmbient();
          }
        }).catch(() => {});
      }
      if (!window.soundManager.ambientState.isPlaying) {
        window.soundManager.startCozyAmbient();
      }
    }
    ['pointerdown', 'touchstart'].forEach(evt => {
      window.removeEventListener(evt, startAmbientOnFirstGesture, { capture: true });
    });
  };

  ['pointerdown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, startAmbientOnFirstGesture, { capture: true, once: true });
  });

  // ===================================================
  // CONTROLE DE SOM
  // ===================================================
  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isMuted = window.soundManager.toggleMute();
    soundBtn.textContent = isMuted ? '🔇' : '🔊';
    if (!isMuted) {
      window.soundManager.playPop();
    }
  });

  // ===================================================
  // QUADRO 1: O DESPERTAR REAL (INTERAÇÃO DE TOQUE)
  // ===================================================
  catQ1.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    applyTouchLift(catQ1);
    window.soundManager.playMeow();
    const rect = catQ1.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    spawnParticles(rect.left + 35 - canvasRect.left, rect.top + 20 - canvasRect.top, 12, 'heart');
    showOnomatopoeia('MIAU!', 30, 260, panels[0]);
  });

  bedInteractive.addEventListener('pointerdown', (e) => {
    if (q1Awake) return;
    applyTouchLift(bedInteractive);
    q1Awake = true;

    const rect = bedInteractive.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2 - canvasRect.left, rect.top + 40 - canvasRect.top, 22, 'star');

    showOnomatopoeia('PLIM!', 75, 170, panels[0]);

    bedInteractive.style.opacity = '0.35';
    bedInteractive.classList.remove('idle-bounce', 'idle-wiggle');
    princessQ1Standing.style.display = 'block';

    bubbleQ1.style.display = 'block';
    window.soundManager.playMagicChime();

    setTimeout(() => {
      scrollToPanel(1);
    }, 1900);
  });

  // ===================================================
  // QUADRO 2: PUZZLE DO GUARDA-ROUPA (DRAG & DROP NATIVO)
  // ===================================================
  let draggedDress = null;
  let dressStartX = 0;
  let dressStartY = 0;

  dressItems.forEach(item => {
    item.addEventListener('pointerdown', (e) => {
      if (q2Dressed) return;
      resetIdleTimer();
      window.soundManager.init();

      draggedDress = item;
      draggedDress.classList.remove('idle-wiggle');
      applyTouchLift(item);
      try { item.setPointerCapture(e.pointerId); } catch (err) {}

      dressStartX = e.clientX;
      dressStartY = e.clientY;

      item.classList.add('dragging');
      dropHalo.classList.add('active-target');
    });

    item.addEventListener('pointermove', (e) => {
      if (!draggedDress || draggedDress !== item) return;
      const dx = e.clientX - dressStartX;
      const dy = e.clientY - dressStartY;

      item.style.transform = `translate(${dx}px, ${dy}px) scale(1.15) rotate(4deg)`;

      // Snap magnético: acende o alvo quando o CENTRO do item entra no raio.
      const d = euclidDist(
        rectCenter(item.getBoundingClientRect()),
        rectCenter(dropTargetPrincess.getBoundingClientRect())
      );
      dropHalo.classList.toggle('snap-ready', d <= SNAP_RADIUS);
    });

    item.addEventListener('pointerup', (e) => {
      if (!draggedDress || draggedDress !== item) return;
      finishDressDrag(e, item);
    });

    item.addEventListener('pointercancel', (e) => {
      if (!draggedDress || draggedDress !== item) return;
      finishDressDrag(e, item);
    });
  });

  function finishDressDrag(e, item) {
    // pointercancel também cai aqui: limpa lift + estado de drag sempre.
    const dx = e.clientX - dressStartX;
    const dy = e.clientY - dressStartY;
    draggedDress = null;
    dropHalo.classList.remove('active-target', 'snap-ready');
    releaseTouchLift(item);

    const princessRect = dropTargetPrincess.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const d = euclidDist(rectCenter(itemRect), rectCenter(princessRect));
    // Tolerância de soltura: sobreposição > 25% OU distância <= raio de snap.
    const isOverPrincess = d <= SNAP_RADIUS || overlapRatio(itemRect, princessRect) > 0.25;

    const dressType = item.dataset.dressType;

    if (isOverPrincess && dressType === 'pink') {
      // ACERTOU: VESTIDO REAL ROSA DE GALA
      q2Dressed = true;

      window.soundManager.playMagicChime();
      window.soundManager.playSparkleDust();

      // Encaixe magnético até o centro exato da princesa (Ease-Out-Back).
      snapItemToCenter(item, dropTargetPrincess, dx, dy, 340, () => {
        item.style.display = 'none';
        item.style.transform = '';
      });

      const pRect = dropTargetPrincess.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      spawnParticles(
        pRect.left + pRect.width / 2 - canvasRect.left,
        pRect.top + pRect.height / 2 - canvasRect.top,
        45,
        'star'
      );

      showOnomatopoeia('BRILHO!', 85, 230, panels[1]);

      princessQ2Pajamas.style.display = 'none';
      princessQ2Dressed.style.display = 'block';
      princessQ2Dressed.classList.add('princess-dressed-spin');

      bubbleQ2.innerHTML = 'Ficou deslumbrante! ✨ Agora preciso da <strong>Chave de Fita</strong>!';

      setTimeout(() => {
        scrollToPanel(2);
      }, 1900);

    } else if (isOverPrincess && dressType !== 'pink') {
      // ERROU: VESTIDO INCORRETO
      window.soundManager.playBoing();
      showOnomatopoeia('OPS!', 95, 210, panels[1]);

      bubbleQ2.innerHTML = 'Esse traje é lindo, mas não é o do Baile Real!';

      item.classList.add('drag-snap-back');
      item.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
      setTimeout(() => {
        item.classList.remove('dragging', 'drag-snap-back');
        item.style.transform = '';
      }, 350);

    } else {
      item.classList.add('drag-snap-back');
      item.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
      setTimeout(() => {
        item.classList.remove('dragging', 'drag-snap-back');
        item.style.transform = '';
      }, 350);
    }
  }

  // ===================================================
  // QUADRO 3: A PENTEADEIRA & A CHAVE ESCONDIDA
  // ===================================================
  pillowTarget.addEventListener('pointerdown', (e) => {
    if (q3PillowMoved) return;
    applyTouchLift(pillowTarget);
    q3PillowMoved = true;
    resetIdleTimer();

    window.soundManager.playSparkleDust();

    pillowTarget.classList.remove('idle-bounce', 'idle-wiggle');
    pillowTarget.classList.add('slid-away');

    showOnomatopoeia('FUUSH!', 45, 240, panels[2]);

    hiddenKey.style.display = 'block';
    const keyRect = hiddenKey.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    spawnParticles(keyRect.left + 25 - canvasRect.left, keyRect.top + 25 - canvasRect.top, 24, 'star');

    bubbleQ3.innerHTML = 'A <strong>Chave Dourada</strong> estava aqui! Toque nela para abrir a gaveta!';
  });

  hiddenKey.addEventListener('pointerdown', (e) => {
    if (!q3PillowMoved || q3KeyUnlocked) return;
    applyTouchLift(hiddenKey);
    q3KeyUnlocked = true;
    resetIdleTimer();

    window.soundManager.playLockClick();

    hiddenKey.classList.remove('idle-wiggle');
    hiddenKey.classList.add('key-flying');

    setTimeout(() => {
      showOnomatopoeia('CLIC!', 140, 270, panels[2]);
      window.soundManager.playSparkleDust();
      startShapeMatch(); // A chave só destrava a 1ª volta: agora vem o shape-match dos entalhes.
    }, 550);
  });

  // ===================================================
  // QUADRO 3B: SHAPE-MATCH DA PENTEADEIRA (GAVETA SECRETA)
  //  Três entalhes em baixo-relevo (Coração / Estrela / Flor) e três
  //  pedrinhas no tampo. Cada pedra só encaixa no entalhe de MESMA forma.
  //  Aos 3 encaixes: destrava (playLockUnlock), a gaveta abre e SÓ ENTÃO
  //  a pista das patinhas azul-turquesa aparece antes de ir à Biblioteca.
  // ===================================================
  const gemWrongLines = [
    'Quase! Essa pedrinha é de outro entalhe. 😊',
    'A forma não bate... procura o desenho igualzinho!',
    'Coração no coração, estrela na estrela, flor na flor! 🌸'
  ];
  let gemWrongIdx = 0;

  function startShapeMatch() {
    shapeMatchLayer.classList.add('smatch-active');
    bubbleQ3.innerHTML = 'A chave girou... e a gaveta tem <strong>três entalhes</strong>! Encaixe cada pedrinha na forma igual. 💎';
    resetIdleTimer();
  }

  function firstUnmatchedGem() {
    for (const g of gemItems) {
      if (!g.classList.contains('gem-locked')) return g;
    }
    return null;
  }

  function slotForShape(shape) {
    for (const s of carvingSlots) {
      if (s.dataset.shape === shape) return s;
    }
    return null;
  }

  let draggedGem = null;
  let gemStartX = 0;
  let gemStartY = 0;

  gemItems.forEach(item => {
    item.addEventListener('pointerdown', (e) => {
      if (q3ShapeMatchDone || item.classList.contains('gem-locked')) return;
      resetIdleTimer();
      window.soundManager.init();

      draggedGem = item;
      item.classList.remove('idle-wiggle');
      applyTouchLift(item);
      try { item.setPointerCapture(e.pointerId); } catch (err) {}

      gemStartX = e.clientX;
      gemStartY = e.clientY;
      item.classList.add('dragging');
    });

    item.addEventListener('pointermove', (e) => {
      if (!draggedGem || draggedGem !== item) return;
      const dx = e.clientX - gemStartX;
      const dy = e.clientY - gemStartY;
      item.style.transform = `translate(${dx}px, ${dy}px) scale(1.15) rotate(3deg)`;

      // Snap magnético: acende só o entalhe da MESMA forma quando o centro entra no raio.
      const gc = rectCenter(item.getBoundingClientRect());
      carvingSlots.forEach(slot => {
        const match = slot.dataset.shape === item.dataset.shape && !slot.classList.contains('filled');
        const near = euclidDist(gc, rectCenter(slot.getBoundingClientRect())) <= SNAP_RADIUS;
        slot.classList.toggle('snap-ready', match && near);
      });
    });

    item.addEventListener('pointerup', (e) => {
      if (!draggedGem || draggedGem !== item) return;
      finishGemDrag(e, item);
    });

    item.addEventListener('pointercancel', (e) => {
      if (!draggedGem || draggedGem !== item) return;
      finishGemDrag(e, item);
    });
  });

  function finishGemDrag(e, item) {
    // pointercancel também cai aqui: limpa lift + estado de drag sempre.
    const dx = e.clientX - gemStartX;
    const dy = e.clientY - gemStartY;
    draggedGem = null;
    releaseTouchLift(item);
    carvingSlots.forEach(s => s.classList.remove('snap-ready'));

    const itemRect = item.getBoundingClientRect();
    const gc = rectCenter(itemRect);

    // Primeiro entalhe livre dentro da tolerância (raio de snap OU sobreposição > 25%).
    let hitSlot = null;
    carvingSlots.forEach(slot => {
      if (hitSlot || slot.classList.contains('filled')) return;
      const sr = slot.getBoundingClientRect();
      const near = euclidDist(gc, rectCenter(sr)) <= SNAP_RADIUS || overlapRatio(itemRect, sr) > 0.25;
      if (near) hitSlot = slot;
    });

    if (hitSlot && hitSlot.dataset.shape === item.dataset.shape) {
      // ACERTOU: pedra encaixa no entalhe de forma correspondente.
      hitSlot.classList.add('filled');
      hitSlot.dataset.filled = '1';
      item.classList.add('gem-locked');
      q3ShapesMatched++;

      window.soundManager.playLockClick();

      // Encaixe magnético até o centro exato do entalhe (Ease-Out-Back).
      snapItemToCenter(item, hitSlot, dx, dy, 320);

      const sc = rectCenter(hitSlot.getBoundingClientRect());
      const canvasRect = canvas.getBoundingClientRect();
      spawnParticles(sc.x - canvasRect.left, sc.y - canvasRect.top, 18, 'star');

      if (q3ShapesMatched >= 3) {
        completeShapeMatch();
      } else {
        bubbleQ3.innerHTML = q3ShapesMatched === 1
          ? 'Encaixou! ✨ Faltam <strong>duas</strong>.'
          : 'Isso! 💗 Só falta <strong>uma</strong>.';
        resetIdleTimer();
      }

    } else if (hitSlot) {
      // ERROU O ENTALHE: cômico e não-punitivo, sem tela de erro.
      window.soundManager.playBoing();
      showOnomatopoeia('TOING!', 120, 250, panels[2]);
      bubbleQ3.innerHTML = gemWrongLines[gemWrongIdx % gemWrongLines.length];
      gemWrongIdx++;
      snapGemBack(item);
      resetIdleTimer();

    } else {
      // Solto longe de qualquer entalhe: volta pro tampo quicando, sem som de erro.
      snapGemBack(item);
    }
  }

  function snapGemBack(item) {
    item.classList.add('drag-snap-back');
    item.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
    setTimeout(() => {
      item.classList.remove('dragging', 'drag-snap-back');
      item.style.transform = '';
    }, 350);
  }

  function completeShapeMatch() {
    q3ShapeMatchDone = true;
    bubbleQ3.innerHTML = 'As três pedras brilharam juntas...';

    setTimeout(() => {
      window.soundManager.playLockUnlock(); // clique mecânico suave de destravar
      vanityDrawerBox.classList.add('drawer-open');
      showOnomatopoeia('CLIQUE!', 120, 250, panels[2]);

      setTimeout(() => {
        // SÓ ENTÃO revela a pista das patinhas azul-turquesa (movida para cá).
        shapeMatchLayer.classList.remove('smatch-active');
        clueScroll.classList.add('scroll-revealed');
        window.soundManager.playSparkleDust();
        bubbleQ3.innerHTML = 'Um pergaminho! E patinhas azul-turquesa saindo do quarto... rumo à <strong>Biblioteca</strong>!';

        const cRect = clueScroll.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        spawnParticles(cRect.left + cRect.width / 2 - canvasRect.left, cRect.top + 45 - canvasRect.top, 35, 'heart');

        setTimeout(() => {
          scrollToPanel(3); // Avança para o Nível 2 (Quadro 4 - A Biblioteca)
        }, 2600);
      }, 620);
    }, 450);
  }

  // ===================================================
  // QUADRO 4: NÍVEL 2 - O PORTAL DOS TRÊS ASTROS (DRAG & DROP)
  // ===================================================
  owlInteractive.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    applyTouchLift(owlInteractive);
    window.soundManager.playOwlHoot();
    owlHint.style.display = 'block';
    const rect = owlInteractive.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    spawnParticles(rect.left + 25 - canvasRect.left, rect.top + 20 - canvasRect.top, 14, 'star');
    setTimeout(() => {
      owlHint.style.display = 'none';
    }, 1800);
  });

  let draggedKey = null;
  let keyStartX = 0;
  let keyStartY = 0;

  keyDraggables.forEach(item => {
    item.addEventListener('pointerdown', (e) => {
      if (q4PortalUnlocked) return;
      resetIdleTimer();
      window.soundManager.init();

      draggedKey = item;
      draggedKey.classList.remove('idle-wiggle');
      applyTouchLift(item);
      try { item.setPointerCapture(e.pointerId); } catch (err) {}

      keyStartX = e.clientX;
      keyStartY = e.clientY;

      item.classList.add('dragging');
      portalLockTarget.classList.add('active-target');
    });

    item.addEventListener('pointermove', (e) => {
      if (!draggedKey || draggedKey !== item) return;
      const dx = e.clientX - keyStartX;
      const dy = e.clientY - keyStartY;

      item.style.transform = `translate(${dx}px, ${dy}px) scale(1.2) rotate(6deg)`;

      // Snap magnético: acende a fechadura quando o centro da chave entra no raio.
      const d = euclidDist(
        rectCenter(item.getBoundingClientRect()),
        rectCenter(portalLockTarget.getBoundingClientRect())
      );
      portalLockTarget.classList.toggle('snap-ready', d <= SNAP_RADIUS);
    });

    item.addEventListener('pointerup', (e) => {
      if (!draggedKey || draggedKey !== item) return;
      finishKeyDrag(e, item);
    });

    item.addEventListener('pointercancel', (e) => {
      if (!draggedKey || draggedKey !== item) return;
      finishKeyDrag(e, item);
    });
  });

  function finishKeyDrag(e, item) {
    // pointercancel também cai aqui: limpa lift + estado de drag sempre.
    const dx = e.clientX - keyStartX;
    const dy = e.clientY - keyStartY;
    draggedKey = null;
    portalLockTarget.classList.remove('active-target', 'snap-ready');
    releaseTouchLift(item);

    const lockRect = portalLockTarget.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const d = euclidDist(rectCenter(itemRect), rectCenter(lockRect));
    // Tolerância de soltura: sobreposição > 25% OU distância <= raio de snap.
    const isOverLock = d <= SNAP_RADIUS || overlapRatio(itemRect, lockRect) > 0.25;

    const keyType = item.dataset.keyType;

    if (isOverLock && keyType === 'moon') {
      // ACERTOU: CHAVE DA LUA CRESCENTE!
      q4PortalUnlocked = true;

      window.soundManager.playHeavyLockOpen();

      // Encaixe magnético até o centro exato da fechadura (Ease-Out-Back).
      snapItemToCenter(item, portalLockTarget, dx, dy, 340, () => {
        item.style.display = 'none';
        item.style.transform = '';
      });

      const lRect = portalLockTarget.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      spawnParticles(
        lRect.left + lRect.width / 2 - canvasRect.left,
        lRect.top + lRect.height / 2 - canvasRect.top,
        60,
        'star'
      );

      showOnomatopoeia('ABRIU!', 110, 160, panels[3]);

      portalLockTarget.style.borderColor = '#ffd700';
      portalLockTarget.style.boxShadow = '0 0 40px #ffd700';

      bubbleQ4.innerHTML = 'A <strong>Chave da Lua</strong> abriu o Portal! Adiante fica a <strong>Sala das Relíquias</strong>... ✨';

      setTimeout(() => {
        window.soundManager.playRoyalFanfare();
        scrollToPanel(4); // Avança para a Sala das Relíquias (Quadro 2.2 / P4)
      }, 2400);

    } else if (isOverLock && keyType === 'sun') {
      // ERROU: CHAVE DO SOL
      window.soundManager.playSteamHiss();
      showOnomatopoeia('TSSSS!', 110, 180, panels[3]);

      bubbleQ4.innerHTML = 'Ai! Quente como forno! A porta não gosta de sol a pino...';

      item.classList.add('drag-snap-back');
      item.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
      setTimeout(() => {
        item.classList.remove('dragging', 'drag-snap-back');
        item.style.transform = '';
      }, 350);

    } else if (isOverLock && keyType === 'ruby') {
      // ERROU: CHAVE DE RUBI
      window.soundManager.playGrumble();
      showOnomatopoeia('GROOOMP!', 100, 180, panels[3]);

      bubbleQ4.innerHTML = 'Nossa, que dramática! Essa chave de rubi não abriu nada!';

      item.classList.add('drag-snap-back');
      item.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
      setTimeout(() => {
        item.classList.remove('dragging', 'drag-snap-back');
        item.style.transform = '';
      }, 350);

    } else {
      item.classList.add('drag-snap-back');
      item.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
      setTimeout(() => {
        item.classList.remove('dragging', 'drag-snap-back');
        item.style.transform = '';
      }, 350);
    }
  }

  // ===================================================
  // QUADRO 2.2 (P4): A SALA DAS RELÍQUIAS & A ESTANTE DA CRIAÇÃO
  //  Puzzle de ordenação: 4 tomos heráldicos -> 4 nichos (I..IV).
  //  Qualquer tomo entra em qualquer nicho e dá para rearranjar à vontade.
  //  Só RESOLVE quando I..IV = Semente, Broto, Carvalho, Folha (nessa ordem),
  //  conforme "O Poema das Quatro Estações" gravado no friso da estante.
  //  Erros = micro-reações cômicas e NÃO-punitivas (falas literais do roteiro).
  // ===================================================
  const RELIC_ORDER = { 1: 'semente', 2: 'broto', 3: 'carvalho', 4: 'folha' };
  const nicheOccupant = { 1: null, 2: null, 3: null, 4: null };
  let lastPlacedTome = null;

  function tomeByKey(key) {
    for (const t of tomeItems) if (t.dataset.tome === key) return t;
    return null;
  }
  function nicheEl(n) {
    for (const el of bookNiches) if (el.dataset.niche === String(n)) return el;
    return null;
  }
  function firstEmptyNiche() {
    for (let n = 1; n <= 4; n++) if (!nicheOccupant[n]) return nicheEl(n);
    return null;
  }
  function firstTableTome() {
    for (const t of tomeItems) if (!t.dataset.niche) return t;
    return null;
  }
  function nicheOfTome(tome) {
    return tome.dataset.niche ? Number(tome.dataset.niche) : null;
  }

  function currentTomeTranslate(item) {
    return { dx: item._tx || 0, dy: item._ty || 0 };
  }

  // Anima o transform (translate) do tomo com Ease-Out-Back, sem transição CSS concorrente.
  function animateTomeTransform(item, from, to, duration, onDone) {
    item.classList.add('tome-animating');
    const t0 = performance.now();
    function frame(now) {
      let p = (now - t0) / duration;
      if (p > 1) p = 1;
      const e = easeOutBack(p);
      const x = from.dx + (to.dx - from.dx) * e;
      const y = from.dy + (to.dy - from.dy) * e;
      item.style.transform = `translate(${x}px, ${y}px) scale(1)`;
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        item.style.transform = `translate(${to.dx}px, ${to.dy}px) scale(1)`;
        item._tx = to.dx;
        item._ty = to.dy;
        item.classList.remove('tome-animating');
        if (typeof onDone === 'function') onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  // translate (a partir de um baseline dx/dy) para centrar `item` sobre `targetEl`.
  function translateToCenter(item, targetEl, baseDx, baseDy) {
    const ic = rectCenter(item.getBoundingClientRect());
    const tc = rectCenter(targetEl.getBoundingClientRect());
    return { dx: baseDx + (tc.x - ic.x), dy: baseDy + (tc.y - ic.y) };
  }

  function refreshNicheEl(n) {
    const el = nicheEl(n);
    if (!el) return;
    const filled = !!nicheOccupant[n];
    el.classList.toggle('niche-filled', filled);
    el.classList.toggle('niche-correct', filled && nicheOccupant[n] === RELIC_ORDER[n]);
  }
  function refreshAllNiches() {
    for (let n = 1; n <= 4; n++) refreshNicheEl(n);
  }

  function dockTomeToNiche(item, n, fromDx, fromDy) {
    const target = nicheEl(n);
    const to = translateToCenter(item, target, fromDx, fromDy);
    item.classList.add('tome-docked');
    item.dataset.niche = String(n);
    nicheOccupant[n] = item.dataset.tome;
    animateTomeTransform(item, { dx: fromDx, dy: fromDy }, to, 300);
    refreshNicheEl(n);
  }

  // Devolve o tomo à mesa (posição-base do CSS), esvaziando o nicho que ocupava.
  function ejectTomeToTable(item, withBounce) {
    const n = nicheOfTome(item);
    if (n) { nicheOccupant[n] = null; refreshNicheEl(n); }
    delete item.dataset.niche;
    item.classList.remove('tome-docked', 'spine-glow');
    animateTomeTransform(item, currentTomeTranslate(item), { dx: 0, dy: 0 }, withBounce ? 380 : 260, () => {
      item._tx = 0;
      item._ty = 0;
      item.style.transform = '';
    });
  }

  function relicsBubble(html) {
    bubbleQ5.innerHTML = html;
  }

  function puffDust(x, y) {
    const panel = panels[4];
    for (let i = 0; i < 5; i++) {
      const d = document.createElement('div');
      d.className = 'dust-puff';
      d.style.left = (x + (Math.random() * 40 - 20)) + 'px';
      d.style.top = (y + (Math.random() * 24 - 12)) + 'px';
      panel.appendChild(d);
      setTimeout(() => { if (d.parentNode) d.remove(); }, 720);
    }
  }

  function snapTomeBackToTable(item) {
    item.classList.add('drag-snap-back');
    item.style.transform = 'translate(0, 0) scale(1)';
    setTimeout(() => {
      item.classList.remove('drag-snap-back');
      item.style.transform = '';
      item._tx = 0;
      item._ty = 0;
    }, 380);
  }

  let draggedTome = null;
  let tomeStartX = 0;
  let tomeStartY = 0;

  tomeItems.forEach(item => {
    item.addEventListener('pointerdown', (e) => {
      if (q5RelicsSolved) return;
      resetIdleTimer();
      window.soundManager.init();

      draggedTome = item;
      item.classList.remove('idle-wiggle');
      applyTouchLift(item);
      try { item.setPointerCapture(e.pointerId); } catch (err) {}

      // baseline preserva o deslocamento atual: um tomo já encaixado sai suave, sem "pulo".
      const base = currentTomeTranslate(item);
      tomeStartX = e.clientX - base.dx;
      tomeStartY = e.clientY - base.dy;

      // ao pegar um tomo encaixado, o nicho volta a ficar livre (permite rearranjar/trocar).
      const from = nicheOfTome(item);
      item._fromNiche = from;
      if (from) {
        nicheOccupant[from] = null;
        delete item.dataset.niche;
        refreshNicheEl(from);
      }

      item.classList.add('dragging');
      item.classList.remove('tome-docked');
    });

    item.addEventListener('pointermove', (e) => {
      if (!draggedTome || draggedTome !== item) return;
      const dx = e.clientX - tomeStartX;
      const dy = e.clientY - tomeStartY;
      item._tx = dx;
      item._ty = dy;
      item.style.transform = `translate(${dx}px, ${dy}px) scale(1.12) rotate(2deg)`;

      // Snap magnético: acende só o nicho VAZIO mais próximo dentro do raio.
      const gc = rectCenter(item.getBoundingClientRect());
      let picked = false;
      bookNiches.forEach(el => {
        const n = Number(el.dataset.niche);
        const near = !nicheOccupant[n] &&
          euclidDist(gc, rectCenter(el.getBoundingClientRect())) <= SNAP_RADIUS;
        el.classList.toggle('snap-ready', near && !picked);
        if (near && !picked) picked = true;
      });
    });

    item.addEventListener('pointerup', (e) => {
      if (!draggedTome || draggedTome !== item) return;
      finishTomeDrag(e, item);
    });

    item.addEventListener('pointercancel', (e) => {
      if (!draggedTome || draggedTome !== item) return;
      finishTomeDrag(e, item);
    });
  });

  function finishTomeDrag(e, item) {
    const dx = e.clientX - tomeStartX;
    const dy = e.clientY - tomeStartY;
    draggedTome = null;
    releaseTouchLift(item);
    bookNiches.forEach(el => el.classList.remove('snap-ready'));
    item.classList.remove('dragging');
    item._tx = dx;
    item._ty = dy;

    const itemRect = item.getBoundingClientRect();
    const gc = rectCenter(itemRect);
    const key = item.dataset.tome;
    const fromNiche = item._fromNiche || null;
    item._fromNiche = null;

    // Nicho-alvo: o mais próximo dentro da tolerância (raio de snap OU sobreposição > 25%).
    let hit = null;
    let hitDist = Infinity;
    bookNiches.forEach(el => {
      const sr = el.getBoundingClientRect();
      const d = euclidDist(gc, rectCenter(sr));
      if ((d <= SNAP_RADIUS || overlapRatio(itemRect, sr) > 0.25) && d < hitDist) {
        hit = el;
        hitDist = d;
      }
    });

    if (!hit) {
      // Solto longe de qualquer nicho: volta pra origem (o nicho de onde saiu, ou a mesa).
      if (fromNiche) dockTomeToNiche(item, fromNiche, dx, dy);
      else snapTomeBackToTable(item);
      resetIdleTimer();
      return;
    }

    const n = Number(hit.dataset.niche);

    // ERRO: dois livros no mesmo nicho.
    if (nicheOccupant[n] && nicheOccupant[n] !== key) {
      window.soundManager.playBoing();
      showOnomatopoeia('BOING!', 120, 120, panels[4]);
      relicsBubble('Gulosa! Um livro por vez, ou nem a biblioteca inteira vai aguentar!');
      const resident = tomeByKey(nicheOccupant[n]);
      if (resident) {
        resident.classList.add('idle-wiggle');
        setTimeout(() => resident.classList.remove('idle-wiggle'), 650);
      }
      if (fromNiche) dockTomeToNiche(item, fromNiche, dx, dy);
      else snapTomeBackToTable(item);
      resetIdleTimer();
      return;
    }

    // Encaixa provisoriamente no nicho escolhido.
    dockTomeToNiche(item, n, dx, dy);
    lastPlacedTome = item;

    // ERRO ROTEIRIZADO 1: Folha Dourada no nicho I.
    if (key === 'folha' && n === 1) {
      window.soundManager.playBoing();
      showOnomatopoeia('BOING!', 60, 140, panels[4]);
      relicsBubble('Epa! Não dá para colher folhas de outono antes mesmo da sementinha acordar, dona pressa!');
      setTimeout(() => ejectTomeToTable(item, true), 620);
      resetIdleTimer();
      return;
    }

    // ERRO ROTEIRIZADO 2: Carvalho no nicho II (sem o Broto antes).
    if (key === 'carvalho' && n === 2) {
      window.soundManager.playGrumble();
      showOnomatopoeia('CRRRECK!', 150, 150, panels[4]);
      const r = hit.getBoundingClientRect();
      const pr = panels[4].getBoundingClientRect();
      puffDust(r.left + r.width / 2 - pr.left, r.top + r.height / 2 - pr.top);
      relicsBubble('Atchim! Calma lá, estante... uma árvore gigante não nasce do dia para a noite sem virar broto primeiro!');
      setTimeout(() => ejectTomeToTable(item, true), 620);
      resetIdleTimer();
      return;
    }

    // Verifica a SEQUÊNCIA completa (nunca peças isoladas).
    const allFilled = nicheOccupant[1] && nicheOccupant[2] && nicheOccupant[3] && nicheOccupant[4];
    if (allFilled) {
      const correct = [1, 2, 3, 4].every(k => nicheOccupant[k] === RELIC_ORDER[k]);
      if (correct) {
        resolveRelics();
      } else {
        // Completo, porém fora de ordem (permutação sutil que escapou dos erros
        // roteirizados). A estante "dá de ombros": os tomos fora de época voltam
        // para a mesa, os que já estão certos ficam. Sem punição, sem tela de erro.
        window.soundManager.playPop();
        showOnomatopoeia('HMM?', 150, 130, panels[4]);
        relicsBubble('Quase! Alguns tomos ainda estão fora de época. Vou reler o poema...');
        setTimeout(() => {
          for (let k = 1; k <= 4; k++) {
            if (nicheOccupant[k] && nicheOccupant[k] !== RELIC_ORDER[k]) {
              const t = tomeByKey(nicheOccupant[k]);
              if (t) ejectTomeToTable(t, false);
            }
          }
          refreshAllNiches();
        }, 680);
      }
    } else {
      window.soundManager.playPop();
      relicsBubble('Encaixou! ✨ O tempo caminha... qual estação vem agora?');
    }
    resetIdleTimer();
  }

  function resolveRelics() {
    q5RelicsSolved = true;
    bookNiches.forEach(el => el.classList.remove('snap-ready'));
    refreshAllNiches();

    tomeItems.forEach(t => t.classList.add('spine-glow'));
    creationBookcase.classList.add('crest-complete');

    // Som ritmado de engrenagens de bronze.
    // TODO(áudio/Executor 8): um SFX dedicado de engrenagens cairia melhor que este arranjo.
    window.soundManager.playLockClick();
    setTimeout(() => window.soundManager.playLockClick(), 170);
    setTimeout(() => window.soundManager.playLockClick(), 340);
    setTimeout(() => window.soundManager.playHeavyLockOpen(), 520);
    setTimeout(() => window.soundManager.playMagicChime(), 950);

    showOnomatopoeia('CLEC-CLEC!', 120, 120, panels[4]);
    const bcRect = creationBookcase.getBoundingClientRect();
    const cRect = canvas.getBoundingClientRect();
    spawnParticles(
      bcRect.left + bcRect.width / 2 - cRect.left,
      bcRect.top + bcRect.height / 2 - cRect.top,
      50,
      'star'
    );

    relicsBubble('As lombadas brilham em verde e ouro... a Estante da Criação está recuando! Há um <strong>altar</strong> atrás dela!');

    setTimeout(() => {
      creationBookcase.classList.add('bookcase-recede');
      if (altarReveal) altarReveal.classList.add('revealed');
      window.soundManager.playWhoosh();
    }, 1400);

    setTimeout(() => {
      // Encadeamento do Nível 2: Estante -> Cofre das Engrenagens Celestiais -> Epílogo.
      // O Quadro do Cofre é de outro executor (P5 / Executor 12). Enquanto ele não
      // existir, seguimos direto para o Epílogo (índice 5). Quando o Cofre for
      // inserido entre os dois, este destino passa a ser o índice do novo quadro.
      scrollToPanel(5);
    }, 3400);
  }

  // ===================================================
  // QUADRO 5: REPLAY ORGÂNICO (SELO REAL)
  // ===================================================
  royalSealReplay.addEventListener('pointerdown', () => {
    applyTouchLift(royalSealReplay);
    window.soundManager.playMagicChime();

    const rect = royalSealReplay.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    spawnParticles(rect.left + 40 - canvasRect.left, rect.top + 40 - canvasRect.top, 35, 'star');

    setTimeout(() => {
      // Reset de Estados
      q1Awake = false;
      q2Dressed = false;
      q3PillowMoved = false;
      q3KeyUnlocked = false;
      q3ShapesMatched = 0;
      q3ShapeMatchDone = false;
      gemWrongIdx = 0;
      q4PortalUnlocked = false;
      q5RelicsSolved = false;

      // Reset Q1
      bedInteractive.style.opacity = '1';
      bedInteractive.classList.add('idle-bounce');
      princessQ1Standing.style.display = 'none';
      bubbleQ1.style.display = 'none';

      // Reset Q2
      dressItems.forEach(item => {
        item.style.display = 'flex';
        item.style.transform = '';
        item.classList.remove('dragging', 'drag-snap-back', 'idle-wiggle', 'touch-lift');
      });
      dropHalo.classList.remove('active-target', 'snap-ready');
      princessQ2Pajamas.style.display = 'block';
      princessQ2Dressed.style.display = 'none';
      princessQ2Dressed.classList.remove('princess-dressed-spin');
      bubbleQ2.innerHTML = 'Preciso do meu <strong>Vestido Real Rosa</strong> para o Grande Baile!';

      // Reset Q3
      pillowTarget.classList.remove('slid-away');
      pillowTarget.classList.add('idle-bounce');
      hiddenKey.style.display = 'none';
      hiddenKey.classList.remove('key-flying', 'idle-wiggle');
      clueScroll.classList.remove('scroll-revealed');
      bubbleQ3.innerHTML = 'A gaveta de joias está trancada! Onde está a <strong>Chave com Fita</strong>?';

      // Reset Q3B (shape-match da penteadeira)
      shapeMatchLayer.classList.remove('smatch-active');
      gemItems.forEach(g => {
        g.style.transform = '';
        g.classList.remove('gem-locked', 'dragging', 'drag-snap-back', 'idle-wiggle', 'touch-lift');
      });
      carvingSlots.forEach(s => {
        s.classList.remove('filled', 'snap-ready');
        delete s.dataset.filled;
      });
      vanityDrawerBox.classList.remove('drawer-open');

      // Reset Q4
      keyDraggables.forEach(item => {
        item.style.display = 'flex';
        item.style.transform = '';
        item.classList.remove('dragging', 'drag-snap-back', 'idle-wiggle', 'touch-lift');
      });
      portalLockTarget.classList.remove('active-target', 'snap-ready');
      portalLockTarget.style.borderColor = 'var(--color-gold)';
      portalLockTarget.style.boxShadow = '';
      bubbleQ4.innerHTML = 'A porta da Sala Secreta exige a chave certa! Leia a charada gravada no mármore.';

      // Reset Quadro 2.2 (Sala das Relíquias & Estante da Criação)
      [1, 2, 3, 4].forEach(n => { nicheOccupant[n] = null; });
      lastPlacedTome = null;
      tomeItems.forEach(t => {
        t.style.transform = '';
        t._tx = 0;
        t._ty = 0;
        delete t.dataset.niche;
        t._fromNiche = null;
        t.classList.remove('dragging', 'drag-snap-back', 'touch-lift', 'tome-docked', 'tome-animating', 'spine-glow', 'idle-wiggle');
      });
      const semTome = tomeByKey('semente');
      if (semTome) semTome.classList.add('idle-wiggle');
      bookNiches.forEach(el => el.classList.remove('niche-filled', 'niche-correct', 'snap-ready'));
      creationBookcase.classList.remove('crest-complete', 'bookcase-recede');
      if (altarReveal) altarReveal.classList.remove('revealed');
      bubbleQ5.innerHTML = 'A <strong>Estante da Criação</strong> pede seus quatro tomos na ordem certa. O poema do friso conta a história das estações.';

      // Reset Q5 (Epílogo)
      panels[5].style.display = 'none';

      // Volta ao Quadro 1
      scrollToPanel(0);
    }, 400);
  });

  // Reverter o Lift & Scale (P2) em todo elemento de toque simples.
  [catQ1, bedInteractive, pillowTarget, hiddenKey, owlInteractive, royalSealReplay].forEach(el => {
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
      el.addEventListener(evt, () => releaseTouchLift(el));
    });
  });

  // Iniciar timer de idle inicial
  resetIdleTimer();
});
