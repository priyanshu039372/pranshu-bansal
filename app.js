/**
 * VOXIFY AI - ElevenLabs Speech Engine & Real-time Speech Recognition
 */

(() => {
  // --- Constants & Storage Keys ---
  const STORAGE_KEY_API = 'voxify_elevenlabs_api_key';
  const STORAGE_KEY_HISTORY = 'voxify_generation_history';

  // Fallback ElevenLabs Premade Voices
  const DEFAULT_VOICES = [
    { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade', description: 'American, Calm & Expressive' },
    { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade', description: 'American, Deep & Narration' },
    { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', category: 'premade', description: 'American, Well-rounded' },
    { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade', description: 'American, Dynamic & Friendly' },
    { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade', description: 'American, Natural & Conversational' },
    { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', category: 'premade', description: 'American, Young & Dynamic' },
    { voice_id: 'VR6AewLTigWG4xVXakKG', name: 'Arnold', category: 'premade', description: 'American, Crisp Narrator' },
    { voice_id: 'yoZ06a0pkBx6g4G37o0b', name: 'Sam', category: 'premade', description: 'American, Warm Commercial' },
    { voice_id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', category: 'premade', description: 'British, Soft & Smooth' },
    { voice_id: 'piTKgcLEGmPE4e6mEKli', name: 'Nicole', category: 'premade', description: 'American, Whispery & Gentle' },
    { voice_id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', category: 'premade', description: 'American, Gritty & Intense' },
    { voice_id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave', category: 'premade', description: 'British, Conversational Video Game' }
  ];

  // --- State ---
  const state = {
    apiKey: localStorage.getItem(STORAGE_KEY_API) || '',
    isListening: false,
    isGenerating: false,
    currentAudioUrl: null,
    currentBlob: null,
    currentWord: '',
    history: JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]'),
    recognition: null,
    audioVisualizer: null,
    subscriptionInfo: null
  };

  // --- DOM Elements ---
  const elements = {
    // Header & Status
    connectionStatus: document.getElementById('connectionStatus'),
    statusText: document.getElementById('statusText'),
    openApiModalBtn: document.getElementById('openApiModalBtn'),
    
    // Mic & Speech Input
    micButton: document.getElementById('micButton'),
    micWaveRings: document.getElementById('micWaveRings'),
    micStatusText: document.getElementById('micStatusText'),
    micSubtext: document.getElementById('micSubtext'),
    autoSynthesizeCheck: document.getElementById('autoSynthesizeCheck'),
    wordInput: document.getElementById('wordInput'),
    clearInputBtn: document.getElementById('clearInputBtn'),
    charCount: document.getElementById('charCount'),
    wordCountBadge: document.getElementById('wordCountBadge'),
    wordChips: document.querySelectorAll('.word-chip'),
    
    // Voice & Model Controls
    voiceSelect: document.getElementById('voiceSelect'),
    voiceBadge: document.getElementById('voiceBadge'),
    refreshVoicesBtn: document.getElementById('refreshVoicesBtn'),
    stabilitySlider: document.getElementById('stabilitySlider'),
    stabilityVal: document.getElementById('stabilityVal'),
    similaritySlider: document.getElementById('similaritySlider'),
    similarityVal: document.getElementById('similarityVal'),
    styleSlider: document.getElementById('styleSlider'),
    styleVal: document.getElementById('styleVal'),
    generateBtn: document.getElementById('generateBtn'),
    generateBtnText: document.getElementById('generateBtnText'),
    
    // Playback & Visualizer
    playbackSection: document.querySelector('.playback-section'),
    mainAudioElement: document.getElementById('mainAudioElement'),
    waveformCanvas: document.getElementById('waveformCanvas'),
    currentAudioTitle: document.getElementById('currentAudioTitle'),
    currentAudioVoice: document.getElementById('currentAudioVoice'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    playIcon: document.getElementById('playIcon'),
    pauseIcon: document.getElementById('pauseIcon'),
    downloadAudioBtn: document.getElementById('downloadAudioBtn'),
    progressTrack: document.getElementById('progressTrack'),
    progressBar: document.getElementById('progressBar'),
    currentTimeDisplay: document.getElementById('currentTimeDisplay'),
    durationTimeDisplay: document.getElementById('durationTimeDisplay'),
    speedBtns: document.querySelectorAll('.speed-btn'),
    
    // History
    historyList: document.getElementById('historyList'),
    historyCountBadge: document.getElementById('historyCountBadge'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    
    // API Modal
    apiModal: document.getElementById('apiModal'),
    closeApiModalBtn: document.getElementById('closeApiModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
    saveKeyBtnText: document.getElementById('saveKeyBtnText'),
    clearKeyBtn: document.getElementById('clearKeyBtn'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    toggleKeyVisibilityBtn: document.getElementById('toggleKeyVisibilityBtn'),
    accountInfoCard: document.getElementById('accountInfoCard'),
    accountTier: document.getElementById('accountTier'),
    accountChars: document.getElementById('accountChars'),
    quotaProgressBar: document.getElementById('quotaProgressBar'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Sound Effects Synthesizer (Zero External Dependencies) ---
  const soundFx = {
    audioCtx: null,
    getAudioCtx() {
      if (!this.audioCtx) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (AudioClass) this.audioCtx = new AudioClass();
      }
      return this.audioCtx;
    },
    playChime(type = 'start') {
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'start') {
          // Cheerful rising tone
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.22);
        } else if (type === 'stop') {
          // Soft falling tone
          osc.type = 'sine';
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.exponentialRampToValueAtTime(330, now + 0.16);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === 'success') {
          // Futuristic chord
          [523.25, 659.25, 783.99].forEach((freq, idx) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(freq, now + idx * 0.05);
            g.gain.setValueAtTime(0.05, now + idx * 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(now + idx * 0.05);
            o.stop(now + idx * 0.05 + 0.35);
          });
        }
      } catch (err) {
        // Audio effects are purely cosmetic; ignore audio context errors
      }
    }
  };

  // --- Initialize App ---
  function init() {
    initVisualizer();
    initSpeechRecognition();
    setupEventListeners();
    updateConnectionStatusUI();
    renderHistory();
    updateInputStats();

    if (state.apiKey) {
      elements.apiKeyInput.value = state.apiKey;
      fetchVoices();
      fetchAccountDetails();
    } else {
      populateDefaultVoices();
    }
  }

  // --- Visualizer Initialization ---
  function initVisualizer() {
    state.audioVisualizer = new AudioWaveformVisualizer('waveformCanvas', elements.mainAudioElement);
  }

  // --- Speech Recognition (Microphone Speech-to-Word) ---
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      elements.micStatusText.textContent = 'Voice recognition not supported in this browser. Please use Chrome/Edge.';
      elements.micButton.disabled = true;
      elements.micButton.style.opacity = '0.5';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      state.isListening = true;
      elements.micButton.classList.add('is-recording');
      elements.micWaveRings.classList.add('active');
      elements.micStatusText.textContent = 'Listening... Speak any word now!';
      elements.micStatusText.classList.add('recording');
      elements.micSubtext.textContent = 'Listening for speech input...';
      soundFx.playChime('start');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const spoken = (finalTranscript || interimTranscript).trim();
      if (spoken) {
        elements.wordInput.value = spoken;
        updateInputStats();
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopListening();
      if (event.error === 'not-allowed') {
        showToast('Microphone access was denied. Please allow mic permissions in your browser.', 'error');
        elements.micStatusText.textContent = 'Microphone permission blocked';
      } else if (event.error === 'no-speech') {
        showToast('No speech detected. Click the mic and try saying a word!', 'info');
        elements.micStatusText.textContent = 'No word detected. Click to try again.';
      } else {
        showToast(`Voice error: ${event.error}`, 'error');
      }
    };

    recognition.onend = () => {
      const wasListening = state.isListening;
      stopListening();

      const text = elements.wordInput.value.trim();
      if (wasListening && text && elements.autoSynthesizeCheck.checked) {
        showToast(`Transcribed: "${text}" - Synthesizing speech...`, 'info');
        handleGenerateSpeech();
      }
    };

    state.recognition = recognition;
  }

  function toggleListening() {
    if (!state.recognition) {
      showToast('Speech recognition is not available in your browser.', 'error');
      return;
    }

    if (state.isListening) {
      stopListening();
      state.recognition.stop();
    } else {
      try {
        state.recognition.start();
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    }
  }

  function stopListening() {
    state.isListening = false;
    elements.micButton.classList.remove('is-recording');
    elements.micWaveRings.classList.remove('active');
    elements.micStatusText.textContent = 'Click the microphone & say any word';
    elements.micStatusText.classList.remove('recording');
    elements.micSubtext.innerHTML = 'Shortcut: <kbd>Ctrl</kbd> + <kbd>M</kbd>';
    soundFx.playChime('stop');
  }

  // --- Voice Library & Fetching ---
  function populateDefaultVoices(customList = null) {
    const voices = customList || DEFAULT_VOICES;
    elements.voiceSelect.innerHTML = '';

    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.voice_id;
      const desc = v.description || (v.labels ? Object.values(v.labels).join(', ') : 'AI Voice');
      opt.textContent = `${v.name} (${desc})`;
      opt.dataset.category = v.category || 'premade';
      elements.voiceSelect.appendChild(opt);
    });

    updateVoiceBadge();
  }

  async function fetchVoices() {
    if (!state.apiKey) {
      populateDefaultVoices();
      return;
    }

    elements.refreshVoicesBtn.classList.add('spinning');

    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': state.apiKey
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to load voices (${res.status})`);
      }

      const data = await res.json();
      if (data.voices && data.voices.length > 0) {
        populateDefaultVoices(data.voices);
        showToast(`Loaded ${data.voices.length} voices from your ElevenLabs account!`, 'success');
      }
    } catch (err) {
      console.warn('Could not fetch custom voices, using presets:', err);
      populateDefaultVoices();
    } finally {
      elements.refreshVoicesBtn.classList.remove('spinning');
    }
  }

  async function fetchAccountDetails() {
    if (!state.apiKey) return;

    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': state.apiKey }
      });

      if (!res.ok) return;

      const info = await res.json();
      state.subscriptionInfo = info;

      const charCount = info.character_count || 0;
      const charLimit = info.character_limit || 10000;
      const tier = (info.tier || 'Free').toUpperCase();
      const pct = Math.min(100, Math.round((charCount / charLimit) * 100));

      // Update UI in Modal
      elements.accountTier.textContent = tier;
      elements.accountChars.textContent = `${charCount.toLocaleString()} / ${charLimit.toLocaleString()} (${pct}%)`;
      elements.quotaProgressBar.style.width = `${pct}%`;
      elements.accountInfoCard.classList.remove('hidden');

      // Update header status
      elements.statusText.textContent = `ElevenLabs: ${tier} (${(charLimit - charCount).toLocaleString()} chars left)`;
    } catch (err) {
      console.warn('Could not fetch subscription details:', err);
    }
  }

  function updateVoiceBadge() {
    const selected = elements.voiceSelect.selectedOptions[0];
    if (selected) {
      const cat = selected.dataset.category || 'Voice';
      elements.voiceBadge.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    }
  }

  // --- Speech Synthesis Core ---
  async function handleGenerateSpeech() {
    const text = elements.wordInput.value.trim();
    if (!text) {
      showToast('Please say or type a word first!', 'error');
      elements.wordInput.focus();
      return;
    }

    if (state.isGenerating) return;

    const voiceId = elements.voiceSelect.value;
    const voiceName = elements.voiceSelect.selectedOptions[0]?.textContent.split('(')[0].trim() || 'AI Voice';
    const selectedModel = document.querySelector('input[name="modelSelection"]:checked')?.value || 'eleven_multilingual_v2';
    
    const settings = {
      stability: parseFloat(elements.stabilitySlider.value),
      similarity: parseFloat(elements.similaritySlider.value),
      style: parseFloat(elements.styleSlider.value)
    };

    setGeneratingUI(true);

    try {
      if (state.apiKey) {
        // --- ElevenLabs API Mode ---
        await generateWithElevenLabs(text, voiceId, voiceName, selectedModel, settings);
      } else {
        // --- Demo Fallback Mode (Browser Native Speech Synthesis) ---
        await generateWithBrowserFallback(text, voiceName);
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
      showToast(`Error: ${error.message}`, 'error');
      // If ElevenLabs fails (e.g. quota or bad key), offer fallback
      if (state.apiKey) {
        showToast('Falling back to local browser speech synthesizer...', 'info');
        await generateWithBrowserFallback(text, voiceName);
      }
    } finally {
      setGeneratingUI(false);
    }
  }

  async function generateWithElevenLabs(text, voiceId, voiceName, modelId, settings) {
    showToast(`Synthesizing "${text.slice(0, 25)}..." with ElevenLabs ${voiceName}...`, 'info');

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': state.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: {
          stability: settings.stability / 100,
          similarity_boost: settings.similarity / 100,
          style: settings.style / 100,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      let errorMsg = `ElevenLabs API error: HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.detail && errJson.detail.message) {
          errorMsg = errJson.detail.message;
        }
      } catch (e) {
        // ignore json parse error
      }
      throw new Error(errorMsg);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);

    loadAudioIntoPlayer(audioUrl, blob, text, voiceName, 'ElevenLabs');
    saveToHistory(text, voiceName, 'ElevenLabs', audioUrl);
    soundFx.playChime('success');
    showToast(`Speech generated successfully!`, 'success');

    // Refresh remaining quota
    fetchAccountDetails();
  }

  async function generateWithBrowserFallback(text, requestedVoiceName) {
    if (!('speechSynthesis' in window)) {
      throw new Error('Your browser does not support Speech Synthesis.');
    }

    showToast('Demo Mode: Synthesizing via browser engine (Connect ElevenLabs API key for ultra-realistic voices)', 'info');

    // Cancel any active speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best available browser voice
    const sysVoices = window.speechSynthesis.getVoices();
    const naturalVoice = sysVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))) || sysVoices.find(v => v.lang.startsWith('en')) || sysVoices[0];
    if (naturalVoice) utterance.voice = naturalVoice;

    // Update Player UI for Demo Voice
    elements.currentAudioTitle.textContent = `"${text}"`;
    elements.currentAudioVoice.textContent = `Demo Engine (${naturalVoice ? naturalVoice.name : 'Browser Voice'})`;
    elements.playbackSection.classList.add('playing');
    elements.playPauseBtn.disabled = false;
    elements.downloadAudioBtn.disabled = true; // Synthetic utterance isn't a direct downloadable blob

    // Start animated visualizer in simulation mode
    state.audioVisualizer.start(true);

    utterance.onend = () => {
      elements.playbackSection.classList.remove('playing');
      elements.playIcon.classList.remove('hidden');
      elements.pauseIcon.classList.add('hidden');
      state.audioVisualizer.stop();
    };

    utterance.onerror = (e) => {
      elements.playbackSection.classList.remove('playing');
      state.audioVisualizer.stop();
      console.warn('Utterance error:', e);
    };

    window.speechSynthesis.speak(utterance);
    elements.playIcon.classList.add('hidden');
    elements.pauseIcon.classList.remove('hidden');

    saveToHistory(text, 'Browser Demo', 'Demo', null);
  }

  function setGeneratingUI(isGen) {
    state.isGenerating = isGen;
    elements.generateBtn.disabled = isGen;
    if (isGen) {
      elements.generateBtnText.textContent = 'Generating Voice...';
      elements.generateBtn.classList.add('loading');
    } else {
      elements.generateBtnText.textContent = 'Generate Speech';
      elements.generateBtn.classList.remove('loading');
    }
  }

  // --- Audio Player Controls ---
  function loadAudioIntoPlayer(url, blob, text, voiceName, engine) {
    if (state.currentAudioUrl) {
      URL.revokeObjectURL(state.currentAudioUrl);
    }

    state.currentAudioUrl = url;
    state.currentBlob = blob;
    state.currentWord = text;

    elements.mainAudioElement.src = url;
    elements.currentAudioTitle.textContent = `"${text}"`;
    elements.currentAudioVoice.textContent = `${engine} • ${voiceName}`;
    elements.playPauseBtn.disabled = false;
    elements.downloadAudioBtn.disabled = !blob;

    // Auto-play the synthesized speech
    elements.mainAudioElement.play().catch(e => console.log('Autoplay blocked by browser policy:', e));
  }

  function togglePlayPause() {
    const audio = elements.mainAudioElement;
    if (!audio.src && !window.speechSynthesis.speaking) return;

    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        elements.playIcon.classList.add('hidden');
        elements.pauseIcon.classList.remove('hidden');
        state.audioVisualizer.start(true);
      } else {
        window.speechSynthesis.pause();
        elements.playIcon.classList.remove('hidden');
        elements.pauseIcon.classList.add('hidden');
        state.audioVisualizer.stop();
      }
      return;
    }

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function downloadCurrentAudio() {
    if (!state.currentBlob && !state.currentAudioUrl) {
      showToast('No audio file available to download', 'error');
      return;
    }

    const safeName = (state.currentWord || 'voxify-speech')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);
    const filename = `voxify-${safeName}-${Date.now()}.mp3`;

    const a = document.createElement('a');
    a.href = state.currentAudioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast(`Downloaded: ${filename}`, 'success');
  }

  // --- History Management ---
  function saveToHistory(text, voiceName, engine, audioUrl) {
    const item = {
      id: Date.now(),
      text: text,
      voiceName: voiceName,
      engine: engine,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString()
    };

    state.history.unshift(item);
    if (state.history.length > 25) state.history.pop(); // Cap history to 25 items
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history));
    renderHistory();
  }

  function renderHistory() {
    elements.historyCountBadge.textContent = state.history.length;

    if (state.history.length === 0) {
      elements.historyList.innerHTML = `
        <div class="history-empty">
          <div class="empty-icon">🎙️</div>
          <p>Your generated speech clips will appear here.</p>
          <span>Say any word or click Generate to get started!</span>
        </div>
      `;
      return;
    }

    elements.historyList.innerHTML = '';
    state.history.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="history-item-left">
          <button class="history-play-btn" data-id="${item.id}" title="Synthesize again">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <div class="history-text-group">
            <div class="history-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</div>
            <div class="history-meta">
              <span>🗣️ ${escapeHtml(item.voiceName)}</span>
              <span>•</span>
              <span>⚡ ${item.engine}</span>
              <span>•</span>
              <span>🕒 ${item.timestamp}</span>
            </div>
          </div>
        </div>
        <div class="history-item-actions">
          <button class="btn-ghost-small use-text-btn" data-text="${escapeHtml(item.text)}" title="Use this text">
            Insert
          </button>
        </div>
      `;

      // Event listener for re-speaking
      el.querySelector('.history-play-btn').addEventListener('click', () => {
        elements.wordInput.value = item.text;
        updateInputStats();
        handleGenerateSpeech();
      });

      // Event listener for inserting text
      el.querySelector('.use-text-btn').addEventListener('click', () => {
        elements.wordInput.value = item.text;
        updateInputStats();
        elements.wordInput.focus();
        showToast('Text loaded into editor!', 'info');
      });

      elements.historyList.appendChild(el);
    });
  }

  function clearHistory() {
    if (state.history.length === 0) return;
    if (confirm('Are you sure you want to clear your generation history?')) {
      state.history = [];
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      renderHistory();
      showToast('Generation history cleared', 'info');
    }
  }

  // --- API Key Modal & Connection State ---
  function updateConnectionStatusUI() {
    if (state.apiKey) {
      elements.connectionStatus.className = 'status-badge connected';
      elements.statusText.textContent = 'ElevenLabs Connected';
      elements.connectionStatus.title = 'ElevenLabs API Key is active. Click to edit or view quota.';
    } else {
      elements.connectionStatus.className = 'status-badge demo-mode';
      elements.statusText.textContent = 'Demo Mode (Browser TTS)';
      elements.connectionStatus.title = 'Using local browser TTS. Click to connect ElevenLabs API key.';
    }
  }

  function openApiModal() {
    elements.apiKeyInput.value = state.apiKey;
    elements.apiModal.classList.remove('hidden');
    elements.apiKeyInput.focus();
    if (state.apiKey) {
      fetchAccountDetails();
    }
  }

  function closeApiModal() {
    elements.apiModal.classList.add('hidden');
  }

  async function handleSaveApiKey() {
    const rawKey = elements.apiKeyInput.value.trim();
    if (!rawKey) {
      handleClearApiKey();
      closeApiModal();
      return;
    }

    elements.saveKeyBtnText.textContent = 'Verifying...';
    elements.saveApiKeyBtn.disabled = true;

    try {
      // Test key by requesting subscription or voices
      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': rawKey }
      });

      if (!res.ok) {
        throw new Error('Invalid ElevenLabs API Key. Please check your credentials.');
      }

      state.apiKey = rawKey;
      localStorage.setItem(STORAGE_KEY_API, rawKey);
      updateConnectionStatusUI();
      showToast('ElevenLabs API Key connected successfully!', 'success');
      closeApiModal();

      fetchVoices();
      fetchAccountDetails();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      elements.saveKeyBtnText.textContent = 'Save & Connect';
      elements.saveApiKeyBtn.disabled = false;
    }
  }

  function handleClearApiKey() {
    state.apiKey = '';
    localStorage.removeItem(STORAGE_KEY_API);
    elements.apiKeyInput.value = '';
    elements.accountInfoCard.classList.add('hidden');
    updateConnectionStatusUI();
    populateDefaultVoices();
    showToast('ElevenLabs key removed. Switched to Demo Mode.', 'info');
  }

  // --- UI Helpers & Event Listeners ---
  function setupEventListeners() {
    // Microphone
    elements.micButton.addEventListener('click', toggleListening);

    // Text Input updates
    elements.wordInput.addEventListener('input', updateInputStats);
    elements.clearInputBtn.addEventListener('click', () => {
      elements.wordInput.value = '';
      updateInputStats();
      elements.wordInput.focus();
    });

    // Word Chips
    elements.wordChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const word = chip.dataset.word;
        elements.wordInput.value = word;
        updateInputStats();
        handleGenerateSpeech();
      });
    });

    // Voice Selection changes
    elements.voiceSelect.addEventListener('change', updateVoiceBadge);
    elements.refreshVoicesBtn.addEventListener('click', fetchVoices);

    // Sliders
    elements.stabilitySlider.addEventListener('input', (e) => {
      elements.stabilityVal.textContent = `${e.target.value}%`;
    });
    elements.similaritySlider.addEventListener('input', (e) => {
      elements.similarityVal.textContent = `${e.target.value}%`;
    });
    elements.styleSlider.addEventListener('input', (e) => {
      elements.styleVal.textContent = `${e.target.value}%`;
    });

    // Generate Button
    elements.generateBtn.addEventListener('click', handleGenerateSpeech);

    // Audio Playback Events
    const audio = elements.mainAudioElement;
    audio.addEventListener('play', () => {
      elements.playbackSection.classList.add('playing');
      elements.playIcon.classList.add('hidden');
      elements.pauseIcon.classList.remove('hidden');
      state.audioVisualizer.start(false);
    });

    audio.addEventListener('pause', () => {
      elements.playbackSection.classList.remove('playing');
      elements.playIcon.classList.remove('hidden');
      elements.pauseIcon.classList.add('hidden');
      state.audioVisualizer.stop();
    });

    audio.addEventListener('ended', () => {
      elements.playbackSection.classList.remove('playing');
      elements.playIcon.classList.remove('hidden');
      elements.pauseIcon.classList.add('hidden');
      state.audioVisualizer.stop();
      elements.progressBar.style.width = '0%';
      elements.currentTimeDisplay.textContent = '0:00';
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      elements.progressBar.style.width = `${pct}%`;
      elements.currentTimeDisplay.textContent = formatTime(audio.currentTime);
      elements.durationTimeDisplay.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('loadedmetadata', () => {
      elements.durationTimeDisplay.textContent = formatTime(audio.duration);
    });

    // Seek track
    elements.progressTrack.addEventListener('click', (e) => {
      if (!audio.duration) return;
      const rect = elements.progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      audio.currentTime = pct * audio.duration;
    });

    // Speed selector
    elements.speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        elements.speedBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseFloat(btn.dataset.speed);
        audio.playbackRate = speed;
      });
    });

    // Play/Pause & Download
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.downloadAudioBtn.addEventListener('click', downloadCurrentAudio);

    // History
    elements.clearHistoryBtn.addEventListener('click', clearHistory);

    // API Key Modal
    elements.openApiModalBtn.addEventListener('click', openApiModal);
    elements.connectionStatus.addEventListener('click', openApiModal);
    elements.closeApiModalBtn.addEventListener('click', closeApiModal);
    elements.cancelModalBtn.addEventListener('click', closeApiModal);
    elements.saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
    elements.clearKeyBtn.addEventListener('click', handleClearApiKey);
    
    elements.apiModal.addEventListener('click', (e) => {
      if (e.target === elements.apiModal) closeApiModal();
    });

    elements.toggleKeyVisibilityBtn.addEventListener('click', () => {
      const isPass = elements.apiKeyInput.type === 'password';
      elements.apiKeyInput.type = isPass ? 'text' : 'password';
      elements.toggleKeyVisibilityBtn.textContent = isPass ? '🔒' : '👁️';
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Toggle Mic: Ctrl + M
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleListening();
      }

      // Generate: Ctrl + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerateSpeech();
      }

      // Space to play/pause (only when not typing in text input/modal)
      if (e.code === 'Space' && document.activeElement !== elements.wordInput && document.activeElement !== elements.apiKeyInput) {
        if (!elements.apiModal.classList.contains('hidden')) return;
        e.preventDefault();
        togglePlayPause();
      }

      // Escape closes modal
      if (e.key === 'Escape' && !elements.apiModal.classList.contains('hidden')) {
        closeApiModal();
      }
    });
  }

  function updateInputStats() {
    const text = elements.wordInput.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    elements.charCount.textContent = `${chars} character${chars === 1 ? '' : 's'}`;
    elements.wordCountBadge.textContent = `${words} word${words === 1 ? '' : 's'}`;
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ'}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- Start App ---
  document.addEventListener('DOMContentLoaded', init);
})();
