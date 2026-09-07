/**
 * ============================================================================
 * 👑 SOUND MANAGER - SÍNTESE SONORA PROCEDURAL (Web Audio API)
 * Jogo: A Princesa e a Coroa Perdida (HQ Interativa Mobile)
 * 100% Autocontido - Zero dependência de arquivos externos MP3/WAV
 * ============================================================================
 */

class SoundManager {
  /**
   * @param {Object} [options]
   * @param {number} [options.masterVolume=0.8] Volume geral (0 a 1).
   * @param {number} [options.sfxVolume=0.85] Volume dos efeitos (0 a 1).
   * @param {number} [options.ambientVolume=0.45] Volume da música ambiente (0 a 1).
   * @param {boolean} [options.autoUnlock=true] Desbloquear AudioContext automaticamente no primeiro toque.
   */
  constructor(options = {}) {
    this.options = Object.assign({
      masterVolume: 0.8,
      sfxVolume: 0.85,
      ambientVolume: 0.45,
      autoUnlock: true
    }, options);

    this.ctx = null;
    this.isUnlocked = false;
    this.isMuted = false;

    // Barramentos de Áudio (Buses)
    this.masterGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.limiter = null;

    // Nó de Análise em Tempo Real (para visualizadores e telemetria)
    this.analyser = null;

    // Estado da Trilha Sonora Procedural
    this.ambientState = {
      isPlaying: false,
      timerId: null,
      padGain: null,
      padOscs: [],
      currentChordIndex: 0,
      stepIndex: 0,
      bpm: 50
    };

    // Buffer de Ruído Branco Pré-alocado
    this.noiseBuffer = null;

    if (this.options.autoUnlock) {
      this._setupAutoUnlock();
    }
  }

  /**
   * Inicializa o AudioContext e monta o grafo de áudio com limiter transparente anti-clipping.
   */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[SoundManager] Web Audio API não é suportada neste navegador.');
      return;
    }

    this.ctx = new AudioContextClass();

    // 1. Limitador Dinâmico (Compressor transparente para evitar qualquer distorção)
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-2.0, this.ctx.currentTime);
    this.limiter.knee.setValueAtTime(4.0, this.ctx.currentTime);
    this.limiter.ratio.setValueAtTime(14.0, this.ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.limiter.release.setValueAtTime(0.1, this.ctx.currentTime);
    this.limiter.connect(this.ctx.destination);

    // 2. Analisador de Frequência / Osciloscópio para UIs de Visualização
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.connect(this.limiter);

    // 3. Barramento Master
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.options.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.analyser);

    // 4. Barramento de Efeitos Sonoros (SFX)
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.options.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // 5. Barramento de Trilha Sonora Ambiente
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.options.ambientVolume, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Pré-calcula buffer de ruído branco de 1.2s para otimização de CPU
    this._generateNoiseBuffer();
  }

  /**
   * Configura listeners para desbloqueio automático no primeiro gesto (Mobile Safari / Android Chrome).
   */
  _setupAutoUnlock() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const unlockEvents = ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'keydown'];
    
    const unlockHandler = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this._playSilentBuffer();
        }).catch(() => {});
      } else if (this.ctx) {
        this._playSilentBuffer();
      }

      this.isUnlocked = true;
      unlockEvents.forEach(evt => window.removeEventListener(evt, unlockHandler, true));
      
      // Notifica o jogo que o áudio está desbloqueado
      document.dispatchEvent(new CustomEvent('soundmanager:unlocked', { detail: { timestamp: Date.now() } }));
    };

    unlockEvents.forEach(evt => window.addEventListener(evt, unlockHandler, { capture: true, once: false }));
  }

  /**
   * Toca 1 amostra silenciosa para acordar o hardware de som no iOS Safari.
   */
  _playSilentBuffer() {
    if (!this.ctx) return;
    try {
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);
    } catch (e) {}
  }

  /**
   * Cria o buffer de ruído branco procedural reutilizável.
   */
  _generateNoiseBuffer() {
    if (!this.ctx || this.noiseBuffer) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.2);
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  // ==========================================================================
  // 🔊 EFEITOS SONOROS TÁTEIS (SFX)
  // ==========================================================================

  /**
   * 1. Som suave de folhear papel de gibi/quadrinho (ruído branco filtrado com envelope rápido).
   * @param {Object} [options]
   * @param {number} [options.speed=1.0] Velocidade do movimento (maior = mais rápido).
   * @param {number} [options.intensity=1.0] Intensidade do atrito da folha.
   */
  playPageTurn(options = {}) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;

    const { speed = 1.0, intensity = 1.0 } = options;
    const now = this.ctx.currentTime;
    const duration = Math.max(0.16, 0.28 / speed);

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    // Filtro Passa-Altas para corte de frequências abafadas
    const hpFilter = this.ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(340, now);

    // Filtro Passa-Faixa ressonante modelando o atrito da celulose
    const bpFilter = this.ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.Q.setValueAtTime(2.4, now);
    
    // Varredura de frequência do atrito com micro-jitter orgânico
    const jitter = (Math.random() * 0.16 + 0.92);
    bpFilter.frequency.setValueAtTime(800 * jitter, now);
    bpFilter.frequency.exponentialRampToValueAtTime(3100 * jitter, now + duration * 0.38);
    bpFilter.frequency.exponentialRampToValueAtTime(620 * jitter, now + duration);

    // Envelope de ganho orgânico (duplo toque de folheamento)
    const gainNode = this.ctx.createGain();
    const peakVolume = 0.28 * intensity;
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(peakVolume, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(peakVolume * 0.42, now + duration * 0.4);
    gainNode.gain.linearRampToValueAtTime(peakVolume * 0.68, now + duration * 0.62);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(hpFilter);
    hpFilter.connect(bpFilter);
    bpFilter.connect(gainNode);
    gainNode.connect(this.sfxGain);

    noiseSource.start(now);
    noiseSource.stop(now + duration + 0.02);
  }

  /**
   * 2. Som de sino mágico/estrelinhas cintilantes ao resolver um puzzle (acorde arpejado senoidal com decay suave).
   * @param {Object} [options]
   * @param {number} [options.pitch=1.0] Multiplicador de afinação.
   * @param {string} [options.chord='celestial'] 'celestial' (Pentatônica mágica) ou 'triumph' (Tríade Real Maior).
   */
  playSparkle(options = {}) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const { pitch = 1.0, chord = 'celestial' } = options;
    const now = this.ctx.currentTime;

    // Frequências das notas de fada e magia
    const notes = chord === 'triumph'
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98] // C5, E5, G5, C6, E6, G6
      : [1046.50, 1318.51, 1567.98, 1975.53, 2349.32, 2637.02, 3135.96]; // C6, E6, G6, B6, D7, E7, G7

    notes.forEach((baseFreq, index) => {
      const startTime = now + index * 0.048;
      const noteDuration = 0.60;
      const freq = baseFreq * pitch;

      // Oscilador 1: Tom Fundamental Puro
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      // Oscilador 2: Shimmer Harmônico com leve desafinação estéreo (+4 cents)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.004, startTime);

      const gain1 = this.ctx.createGain();
      const gain2 = this.ctx.createGain();

      const noteVolume = 0.16 * Math.pow(0.88, index);
      gain1.gain.setValueAtTime(0.001, startTime);
      gain1.gain.linearRampToValueAtTime(noteVolume, startTime + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

      gain2.gain.setValueAtTime(0.001, startTime);
      gain2.gain.linearRampToValueAtTime(noteVolume * 0.32, startTime + 0.006);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + (noteDuration * 0.65));

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(this.sfxGain);
      gain2.connect(this.sfxGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + noteDuration + 0.05);
      osc2.stop(startTime + noteDuration + 0.05);
    });
  }

  /**
   * 3. Som de estalo orgânico ao tocar em um objeto interativo (Pop / Bubble).
   * @param {Object} [options]
   * @param {number} [options.pitch=1.0] Variação de afinação.
   */
  playPop(options = {}) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const pitch = typeof options === 'number' ? options : (options?.pitch ?? 1.0);
    const now = this.ctx.currentTime;
    const duration = 0.065;

    // Variação microtonal orgânica (±4%)
    const randomVariation = (Math.random() * 0.08 + 0.96) * pitch;
    const startFreq = 720 * randomVariation;
    const endFreq = 180 * randomVariation;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    // Micro-transiente inicial em onda triangular para "click" físico
    const clickOsc = this.ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1450 * randomVariation, now);
    clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.014);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.12, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

    osc.connect(gain);
    clickOsc.connect(clickGain);
    gain.connect(this.sfxGain);
    clickGain.connect(this.sfxGain);

    osc.start(now);
    clickOsc.start(now);
    osc.stop(now + duration + 0.01);
    clickOsc.stop(now + 0.02);
  }

  /**
   * 4. Som elástico de mola de desenho animado quando o jogador tenta arrastar para o local errado (Boing).
   * @param {Object|number} [options] Tom base da mola ou objeto { pitch }.
   * @param {number} [options.pitch=1.0] Tom base da mola.
   */
  playBoing(options = {}) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const pitch = typeof options === 'number' ? options : (options?.pitch ?? 1.0);
    const now = this.ctx.currentTime;
    const duration = 0.42;

    const baseFreq = 175 * pitch;

    // Oscilador da mola (Onda triangular quente)
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.95, now + duration);

    // Oscilador LFO para criar o vibrato característico de mola
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(24, now);
    lfo.frequency.exponentialRampToValueAtTime(5, now + duration);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(95 * pitch, now);
    lfoGain.gain.exponentialRampToValueAtTime(6, now + duration);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + duration + 0.02);
    osc.stop(now + duration + 0.02);
  }

  /**
   * 5. Som de trava mecânica de cofre ou fechadura girando e abrindo (Lock / Unlock).
   * @param {Object} [options]
   * @param {string} [options.type='unlock'] 'unlock' (completo com abertura) ou 'click' (apenas travamento leve).
   */
  playLockUnlock(options = {}) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const { type = 'unlock' } = options;
    const now = this.ctx.currentTime;

    // 1. Clique Metálico Agudo de Engate da Chave (0 ms)
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(1850, now);
    clickOsc.frequency.exponentialRampToValueAtTime(550, now + 0.028);

    clickGain.gain.setValueAtTime(0.18, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    clickOsc.connect(clickGain);
    clickGain.connect(this.sfxGain);
    clickOsc.start(now);
    clickOsc.stop(now + 0.035);

    if (type === 'click') return;

    // 2. Rotação Mecânica do Tambor de Latão (75 ms)
    const clunkTime = now + 0.075;
    const clunkOsc = this.ctx.createOscillator();
    const clunkGain = this.ctx.createGain();
    clunkOsc.type = 'triangle';
    clunkOsc.frequency.setValueAtTime(260, clunkTime);
    clunkOsc.frequency.exponentialRampToValueAtTime(75, clunkTime + 0.07);

    clunkGain.gain.setValueAtTime(0.22, clunkTime);
    clunkGain.gain.exponentialRampToValueAtTime(0.0001, clunkTime + 0.08);

    clunkOsc.connect(clunkGain);
    clunkGain.connect(this.sfxGain);
    clunkOsc.start(clunkTime);
    clunkOsc.stop(clunkTime + 0.09);

    // 3. Disparo do Trinco e Ressonância Metálica da Chapa (180 ms)
    const boltTime = now + 0.18;
    const boltOsc = this.ctx.createOscillator();
    const boltGain = this.ctx.createGain();
    boltOsc.type = 'sine';
    boltOsc.frequency.setValueAtTime(1150, boltTime);
    boltOsc.frequency.exponentialRampToValueAtTime(1140, boltTime + 0.45);

    boltGain.gain.setValueAtTime(0.001, boltTime);
    boltGain.gain.linearRampToValueAtTime(0.20, boltTime + 0.008);
    boltGain.gain.exponentialRampToValueAtTime(0.0001, boltTime + 0.45);

    // Harmônico de ressonância do baú
    const ringOsc = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(2310, boltTime);

    ringGain.gain.setValueAtTime(0.001, boltTime);
    ringGain.gain.linearRampToValueAtTime(0.08, boltTime + 0.005);
    ringGain.gain.exponentialRampToValueAtTime(0.0001, boltTime + 0.32);

    boltOsc.connect(boltGain);
    ringOsc.connect(ringGain);
    boltGain.connect(this.sfxGain);
    ringGain.connect(this.sfxGain);

    boltOsc.start(boltTime);
    ringOsc.start(boltTime);
    boltOsc.stop(boltTime + 0.48);
    ringOsc.stop(boltTime + 0.35);
  }

  /**
   * Clique de fechadura / tranca rápida
   */
  playLockClick() {
    this.playLockUnlock({ type: 'click' });
  }

  /**
   * Som suave de "SWOOSH" para virada de página / transição de quadro
   */
  playWhoosh() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const now = this.ctx.currentTime;
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.25);
  }

  /**
   * Som de sino mágico / glockenspiel para acertos e transformações
   */
  playMagicChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const noteStart = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.22, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteStart);
      osc.stop(noteStart + 0.45);
    });
  }

  /**
   * Efeito sonoro de chuva de estrelas cintilantes (Sparkles)
   */
  playSparkleDust() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const freqs = [1046.5, 1318.5, 1567.98, 2093.0, 2637.0];
    const now = this.ctx.currentTime;

    freqs.forEach((f, idx) => {
      const time = now + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);
      osc.frequency.exponentialRampToValueAtTime(f * 1.15, time + 0.15);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(time);
      osc.stop(time + 0.2);
    });
  }

  /**
   * Som monumental de destravamento de portal de carvalho com arpejo celestial
   */
  playHeavyLockOpen() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Estrondo mecânico grave de engrenagens de ferro
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.setValueAtTime(90, now);
    rumbleOsc.frequency.exponentialRampToValueAtTime(35, now + 0.7);

    rumbleGain.gain.setValueAtTime(0.3, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumbleOsc.start(now);
    rumbleOsc.stop(now + 0.75);

    // 2. Cascata estelar de harpa mágica
    const celestialNotes = [293.66, 369.99, 440.00, 587.33, 739.99, 880.00, 1174.66];
    celestialNotes.forEach((freq, idx) => {
      const t = now + 0.15 + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  /**
   * Mini-fanfarra real triunfal ao concluir o jogo
   */
  playRoyalFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const melody = [
      { f: 392.00, dur: 0.12, del: 0.00 },
      { f: 523.25, dur: 0.12, del: 0.14 },
      { f: 659.25, dur: 0.12, del: 0.28 },
      { f: 783.99, dur: 0.24, del: 0.42 },
      { f: 1046.50, dur: 0.65, del: 0.68 }
    ];

    const now = this.ctx.currentTime;

    melody.forEach(note => {
      const startTime = now + note.del;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + note.dur);
    });
  }

  /**
   * Som de vapor / ferro quente (Tssss!)
   */
  playSteamHiss() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    const now = this.ctx.currentTime;
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.35);
  }

  /**
   * Som de resmungo mecânico (Grooomp!)
   */
  playGrumble() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.15);
    osc.frequency.linearRampToValueAtTime(60, now + 0.35);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Som de miadinho fofo do gatinho Pip
   */
  playMeow() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.linearRampToValueAtTime(750, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.3);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Som de corujinha sábia da biblioteca (Uhuuu!)
   */
  playOwlHoot() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [0, 0.22].forEach((offset, idx) => {
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const f = idx === 0 ? 440 : 380;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f + 40, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(f - 30, t + 0.2);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // ==========================================================================
  // 🎼 TRILHA AMBIENTE PROCEDURAL (COZY MUSIC BOX & MAGICAL PIANO)
  // ==========================================================================

  /**
   * 6. Inicia a trilha sonora ambiente suave gerada proceduralmente em loop infinito.
   * @param {Object} [options]
   * @param {number} [options.bpm=50] Andamento calmo.
   * @param {number} [options.fadeInDuration=2.0] Duração do fade-in em segundos.
   */
  startCozyAmbient(options = {}) {
    if (this.ambientState.isPlaying) return;
    this.init();
    if (!this.ctx) return;

    const { bpm = 50, fadeInDuration = 2.0 } = options;
    this.ambientState.bpm = bpm;
    this.ambientState.isPlaying = true;
    this.ambientState.stepIndex = 0;
    this.ambientState.currentChordIndex = 0;

    // Fade-in suave no barramento ambiente
    const now = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setValueAtTime(0.0001, now);
    this.ambientGain.gain.linearRampToValueAtTime(this.options.ambientVolume, now + fadeInDuration);

    // Inicia sub-pad harmônico acolhedor
    this._startWarmSubPad();

    // Loop de agendamento preciso via AudioContext clock
    const stepDurationMs = (60 / this.ambientState.bpm / 2) * 1000;
    this.ambientState.timerId = setInterval(() => {
      this._tickAmbientStep();
    }, stepDurationMs);

    this._tickAmbientStep(); // Toca o primeiro compasso imediatamente
  }

  /**
   * Pausa a trilha ambiente com fade-out suave.
   * @param {number} [fadeDuration=1.5]
   */
  stopCozyAmbient(fadeDuration = 1.5) {
    if (!this.ambientState.isPlaying) return;
    this.ambientState.isPlaying = false;

    if (this.ambientState.timerId) {
      clearInterval(this.ambientState.timerId);
      this.ambientState.timerId = null;
    }

    if (this.ctx && this.ambientGain) {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
    }

    setTimeout(() => {
      this._stopWarmSubPad();
    }, fadeDuration * 1000);
  }

  /**
   * Cria um colchão harmônico suave (Sub-Pad) com filtro passa-baixa em movimento lento.
   */
  _startWarmSubPad() {
    if (!this.ctx) return;
    this._stopWarmSubPad();

    const now = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.Q.setValueAtTime(1.0, now);

    this.ambientState.padGain = this.ctx.createGain();
    this.ambientState.padGain.gain.setValueAtTime(0.001, now);
    this.ambientState.padGain.gain.linearRampToValueAtTime(0.12, now + 3.0);

    // Frequências dos acordes fundamentais (C3, G3, A2, F2)
    const padFreqs = [130.81, 196.00, 110.00, 87.31];
    padFreqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(filter);
      osc.start(now);
      this.ambientState.padOscs.push(osc);
    });

    filter.connect(this.ambientState.padGain);
    this.ambientState.padGain.connect(this.ambientGain);
  }

  _stopWarmSubPad() {
    if (this.ambientState.padOscs.length > 0) {
      this.ambientState.padOscs.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch (e) {}
      });
      this.ambientState.padOscs = [];
    }
    if (this.ambientState.padGain) {
      try { this.ambientState.padGain.disconnect(); } catch (e) {}
      this.ambientState.padGain = null;
    }
  }

  /**
   * Motor de composição procedural: toca notas de caixinha de música / piano mágico.
   */
  _tickAmbientStep() {
    if (!this.ambientState.isPlaying || this.isMuted || !this.ctx) return;

    // Tabela de progressão harmônica mágica e relaxante
    // Acordes: Cmaj9 -> Am9 -> Fmaj7(#11) -> G6
    const chordProgression = [
      { name: 'Cmaj9',     notes: [261.63, 392.00, 493.88, 659.25, 587.33, 1046.50] }, // C4, G4, B4, E5, D5, C6
      { name: 'Am9',       notes: [220.00, 329.63, 392.00, 523.25, 493.88, 880.00] },  // A3, E4, G4, C5, B4, A5
      { name: 'Fmaj7#11',  notes: [174.61, 261.63, 329.63, 440.00, 587.33, 739.99] },  // F3, C4, E4, A4, D5, F#5
      { name: 'G6add9',    notes: [196.00, 293.66, 392.00, 493.88, 659.25, 880.00] }   // G3, D4, G4, B4, E5, A5
    ];

    const chord = chordProgression[this.ambientState.currentChordIndex];
    const step = this.ambientState.stepIndex % 8;

    // Padrão arpejado com momentos de respiro e sinos agudos
    const notePatterns = [0, 2, 4, 1, 3, 5, 2, -1]; // -1 = pausa suave
    const noteIdx = notePatterns[step];

    if (noteIdx !== -1 && chord.notes[noteIdx]) {
      const freq = chord.notes[noteIdx];
      const isAccent = step === 0 || step === 4;
      this._playMusicBoxNote(freq, isAccent ? 0.22 : 0.14);
    }

    // Avança o passo rítmico
    this.ambientState.stepIndex++;
    if (this.ambientState.stepIndex % 8 === 0) {
      this.ambientState.currentChordIndex = (this.ambientState.currentChordIndex + 1) % chordProgression.length;
    }
  }

  /**
   * Síntese de cada nota da caixinha de música (Music Box / Celesta).
   */
  _playMusicBoxNote(frequency, velocity = 0.18) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const noteDuration = 1.6;

    // Oscilador Senoidal Puro (Corpo da nota)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, now);

    // Oscilador de Overtone / Martelo de Madeira (2x Frequência sutil)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2.0, now);

    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    // Envelope com ataque rápido de tique e decay longo e doce
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(velocity, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + noteDuration);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(velocity * 0.25, now + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + (noteDuration * 0.4));

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.ambientGain);
    gain2.connect(this.ambientGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + noteDuration + 0.05);
    osc2.stop(now + noteDuration + 0.05);
  }

  // ==========================================================================
  // 🎚️ CONTROLES GERAIS DE VOLUME & MUTE
  // ==========================================================================

  setMasterVolume(volume) {
    this.options.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.options.masterVolume, this.ctx.currentTime, 0.03);
    }
  }

  setSfxVolume(volume) {
    this.options.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.options.sfxVolume, this.ctx.currentTime, 0.03);
    }
  }

  setAmbientVolume(volume) {
    this.options.ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(this.options.ambientVolume, this.ctx.currentTime, 0.03);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      const targetGain = this.isMuted ? 0.0 : this.options.masterVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }
    return this.isMuted;
  }
}

// Instância singleton padrão para conveniência global
const soundManager = new SoundManager();
if (typeof window !== 'undefined') {
  window.SoundManager = SoundManager;
  window.soundManager = soundManager;
  window.comicAudio = soundManager; // Alias de compatibilidade com ComicAudioManager
}
