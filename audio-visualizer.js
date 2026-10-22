/**
 * Voxify Audio Visualizer
 * High-performance HTML5 Canvas Visualizer with Web Audio API & Fallback Simulation
 */

class AudioWaveformVisualizer {
  constructor(canvasId, audioElement) {
    this.canvas = document.getElementById(canvasId);
    this.audio = audioElement;
    this.ctx = this.canvas.getContext('2d');
    
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.bufferLength = 0;
    
    this.isPlaying = false;
    this.isSimulating = false;
    this.animationFrameId = null;
    this.phase = 0;
    
    this.initCanvasSize();
    window.addEventListener('resize', () => this.initCanvasSize());
    this.drawIdleState();
  }

  initCanvasSize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 800;
    this.height = rect.height || 140;
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setupAudioContext() {
    if (this.audioCtx) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);

      // Connect HTML5 audio element
      this.source = this.audioCtx.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio API direct stream notice (will use harmonic fallback):', e);
      this.isSimulating = true;
    }
  }

  start(isSpeechSynthesisFallback = false) {
    this.isPlaying = true;
    this.isSimulating = isSpeechSynthesisFallback || !this.audioCtx;

    if (!isSpeechSynthesisFallback && !this.audioCtx) {
      this.setupAudioContext();
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const overlay = document.getElementById('visualizerOverlay');
    if (overlay) overlay.classList.add('hidden');

    this.render();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const overlay = document.getElementById('visualizerOverlay');
    if (overlay) overlay.classList.remove('hidden');

    this.drawIdleState();
  }

  render() {
    if (!this.isPlaying) return;

    this.animationFrameId = requestAnimationFrame(() => this.render());

    const width = this.width;
    const height = this.height;
    const ctx = this.ctx;

    // Smooth trail background
    ctx.fillStyle = 'rgba(10, 12, 20, 0.28)';
    ctx.fillRect(0, 0, width, height);

    if (!this.isSimulating && this.analyser) {
      this.analyser.getByteFrequencyData(this.dataArray);
      this.drawFrequencyBars(this.dataArray);
      this.drawSineGlow(this.dataArray);
    } else {
      this.drawSimulatedWaveform();
    }
  }

  drawFrequencyBars(data) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const barCount = 48;
    const barWidth = (width / barCount) * 0.65;
    const gap = (width / barCount) * 0.35;
    const step = Math.floor(data.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = data[i * step] || 0;
      const percent = value / 255;
      const barHeight = Math.max(4, percent * (height * 0.75));

      const x = i * (barWidth + gap) + gap / 2;
      const y = (height - barHeight) / 2;

      // Dynamic gradient per bar
      const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(0.5, '#8b5cf6');
      grad.addColorStop(1, '#ec4899');

      ctx.fillStyle = grad;
      ctx.shadowBlur = percent > 0.5 ? 12 : 4;
      ctx.shadowColor = 'rgba(139, 92, 246, 0.7)';
      
      // Rounded bar
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 4);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  drawSineGlow(data) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const midY = height / 2;

    this.phase += 0.08;

    ctx.beginPath();
    ctx.moveTo(0, midY);

    for (let x = 0; x < width; x += 6) {
      const sampleIdx = Math.floor((x / width) * (data.length / 2));
      const amp = ((data[sampleIdx] || 40) / 255) * (height * 0.28);
      const y = midY + Math.sin(x * 0.02 + this.phase) * amp;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawSimulatedWaveform() {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const midY = height / 2;

    this.phase += 0.07;

    const barCount = 44;
    const barWidth = (width / barCount) * 0.65;
    const gap = (width / barCount) * 0.35;

    for (let i = 0; i < barCount; i++) {
      const normalized = i / barCount;
      const wave1 = Math.sin(normalized * 12 + this.phase);
      const wave2 = Math.cos(normalized * 6 - this.phase * 0.8);
      const combined = Math.abs(wave1 * 0.6 + wave2 * 0.4);
      const barHeight = Math.max(6, combined * (height * 0.68));

      const x = i * (barWidth + gap) + gap / 2;
      const y = (height - barHeight) / 2;

      const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(0.5, '#6366f1');
      grad.addColorStop(1, '#a855f7');

      ctx.fillStyle = grad;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  drawIdleState() {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Subtle horizontal ambient center line
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Idle quiet dots
    const dotCount = 36;
    const step = width / dotCount;
    for (let i = 0; i < dotCount; i++) {
      const x = i * step + step / 2;
      ctx.beginPath();
      ctx.arc(x, midY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
    }
  }
}
