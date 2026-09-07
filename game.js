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
    document.getElementById('panel-5')
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

  // Quadro 4: Nível 2 - O Portal dos Três Astros
  const bubbleQ4 = document.getElementById('bubble-q4');
  const owlInteractive = document.getElementById('owl-interactive');
  const owlHint = document.getElementById('owl-hint');
  const keyDraggables = document.querySelectorAll('.key-draggable-item');
  const portalLockTarget = document.getElementById('portal-lock-target');

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
  let q4PortalUnlocked = false;

  let idleTimer = null;
  let activeWiggleElement = null;

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
  // AJUDA TÁTIL ORGÂNICA (IDLE WIGGLE APÓS INATIVIDADE)
  // ===================================================
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (activeWiggleElement) {
      activeWiggleElement.classList.remove('idle-wiggle');
      activeWiggleElement = null;
    }

    idleTimer = setTimeout(() => {
      triggerIdleHelp();
    }, 4500);
  }

  function triggerIdleHelp() {
    if (currentPanelIndex === 0 && !q1Awake) {
      activeWiggleElement = bedInteractive;
      bedInteractive.classList.add('idle-wiggle');
    } else if (currentPanelIndex === 1 && !q2Dressed) {
      const pinkDress = document.getElementById('dress-pink');
      activeWiggleElement = pinkDress;
      pinkDress.classList.add('idle-wiggle');
    } else if (currentPanelIndex === 2 && !q3PillowMoved) {
      activeWiggleElement = pillowTarget;
      pillowTarget.classList.add('idle-wiggle');
    } else if (currentPanelIndex === 2 && q3PillowMoved && !q3KeyUnlocked) {
      activeWiggleElement = hiddenKey;
      hiddenKey.classList.add('idle-wiggle');
    } else if (currentPanelIndex === 3 && !q4PortalUnlocked) {
      const moonKey = document.getElementById('key-moon');
      activeWiggleElement = moonKey;
      moonKey.classList.add('idle-wiggle');
    }
  }

  window.addEventListener('pointerdown', () => {
    resetIdleTimer();
  });

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
    window.soundManager.playMeow();
    const rect = catQ1.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    spawnParticles(rect.left + 35 - canvasRect.left, rect.top + 20 - canvasRect.top, 12, 'heart');
    showOnomatopoeia('MIAU!', 30, 260, panels[0]);
  });

  bedInteractive.addEventListener('pointerdown', (e) => {
    if (q1Awake) return;
    q1Awake = true;
    window.soundManager.playPop(1.2);

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
      try { item.setPointerCapture(e.pointerId); } catch (err) {}

      dressStartX = e.clientX;
      dressStartY = e.clientY;

      item.classList.add('dragging');
      dropHalo.classList.add('active-target');
      window.soundManager.playPop(1.4);
    });

    item.addEventListener('pointermove', (e) => {
      if (!draggedDress || draggedDress !== item) return;
      const dx = e.clientX - dressStartX;
      const dy = e.clientY - dressStartY;

      item.style.transform = `translate(${dx}px, ${dy}px) scale(1.15) rotate(4deg)`;

      const princessRect = dropTargetPrincess.getBoundingClientRect();
      if (
        e.clientX >= princessRect.left &&
        e.clientX <= princessRect.right &&
        e.clientY >= princessRect.top &&
        e.clientY <= princessRect.bottom
      ) {
        dropHalo.style.borderColor = '#ffc83b';
      } else {
        dropHalo.style.borderColor = 'var(--color-primary-pink)';
      }
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
    draggedDress = null;
    dropHalo.classList.remove('active-target');

    const princessRect = dropTargetPrincess.getBoundingClientRect();
    const isOverPrincess = (
      e.clientX >= princessRect.left - 25 &&
      e.clientX <= princessRect.right + 25 &&
      e.clientY >= princessRect.top - 25 &&
      e.clientY <= princessRect.bottom + 25
    );

    const dressType = item.dataset.dressType;

    if (isOverPrincess && dressType === 'pink') {
      // ACERTOU: VESTIDO REAL ROSA DE GALA
      q2Dressed = true;
      item.style.display = 'none';

      window.soundManager.playMagicChime();
      window.soundManager.playSparkleDust();

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
    q3PillowMoved = true;
    resetIdleTimer();

    window.soundManager.playPop(1.3);
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
    q3KeyUnlocked = true;
    resetIdleTimer();

    window.soundManager.playLockClick();

    hiddenKey.classList.remove('idle-wiggle');
    hiddenKey.classList.add('key-flying');

    setTimeout(() => {
      showOnomatopoeia('CLIC!', 140, 270, panels[2]);
      window.soundManager.playSparkleDust();

      clueScroll.classList.add('scroll-revealed');
      bubbleQ3.innerHTML = 'Uma pista! As patinhas vão até a <strong>Biblioteca Secreta</strong>!';

      const cRect = clueScroll.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      spawnParticles(cRect.left + cRect.width / 2 - canvasRect.left, cRect.top + 45 - canvasRect.top, 35, 'heart');

      setTimeout(() => {
        scrollToPanel(3); // Avança para o Nível 2 (Quadro 4)
      }, 2600);

    }, 550);
  });

  // ===================================================
  // QUADRO 4: NÍVEL 2 - O PORTAL DOS TRÊS ASTROS (DRAG & DROP)
  // ===================================================
  owlInteractive.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
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
      try { item.setPointerCapture(e.pointerId); } catch (err) {}

      keyStartX = e.clientX;
      keyStartY = e.clientY;

      item.classList.add('dragging');
      portalLockTarget.classList.add('active-target');
      window.soundManager.playPop(1.5);
    });

    item.addEventListener('pointermove', (e) => {
      if (!draggedKey || draggedKey !== item) return;
      const dx = e.clientX - keyStartX;
      const dy = e.clientY - keyStartY;

      item.style.transform = `translate(${dx}px, ${dy}px) scale(1.2) rotate(6deg)`;
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
    draggedKey = null;
    portalLockTarget.classList.remove('active-target');

    const lockRect = portalLockTarget.getBoundingClientRect();
    const isOverLock = (
      e.clientX >= lockRect.left - 25 &&
      e.clientX <= lockRect.right + 25 &&
      e.clientY >= lockRect.top - 25 &&
      e.clientY <= lockRect.bottom + 25
    );

    const keyType = item.dataset.keyType;

    if (isOverLock && keyType === 'moon') {
      // ACERTOU: CHAVE DA LUA CRESCENTE!
      q4PortalUnlocked = true;
      item.style.display = 'none';

      window.soundManager.playHeavyLockOpen();

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

      bubbleQ4.innerHTML = 'A <strong>Chave da Lua</strong> abriu o Portal Secreta! Encontramos a Coroa! ✨';

      setTimeout(() => {
        window.soundManager.playRoyalFanfare();
        scrollToPanel(4); // Avança para o Epílogo (Quadro 5)
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
  // QUADRO 5: REPLAY ORGÂNICO (SELO REAL)
  // ===================================================
  royalSealReplay.addEventListener('pointerdown', () => {
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
      q4PortalUnlocked = false;

      // Reset Q1
      bedInteractive.style.opacity = '1';
      bedInteractive.classList.add('idle-bounce');
      princessQ1Standing.style.display = 'none';
      bubbleQ1.style.display = 'none';

      // Reset Q2
      dressItems.forEach(item => {
        item.style.display = 'flex';
        item.style.transform = '';
        item.classList.remove('dragging', 'drag-snap-back', 'idle-wiggle');
      });
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

      // Reset Q4
      keyDraggables.forEach(item => {
        item.style.display = 'flex';
        item.style.transform = '';
        item.classList.remove('dragging', 'drag-snap-back', 'idle-wiggle');
      });
      portalLockTarget.style.borderColor = 'var(--color-gold)';
      portalLockTarget.style.boxShadow = '';
      bubbleQ4.innerHTML = 'A porta da Sala Secreta exige a chave certa! Leia a charada gravada no mármore.';

      // Reset Q5
      panels[4].style.display = 'none';

      // Volta ao Quadro 1
      scrollToPanel(0);
    }, 400);
  });

  // Iniciar timer de idle inicial
  resetIdleTimer();
});
