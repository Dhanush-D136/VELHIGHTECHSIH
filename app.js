/* ==========================================================================
   SIH 2026 - PURE FRONTEND STANDALONE COUNTDOWN CONTROLLER
   Vel Tech High Tech Dr. Rangarajan Dr. Sakunthala Engineering College
   ========================================================================== */

(function () {
  'use strict';

  const body = document.body;
  const startBtn = document.getElementById('startHackathonBtn');
  const prelaunchContainer = document.getElementById('prelaunchContainer');
  const countdownContainer = document.getElementById('countdownContainer');
  const completionContainer = document.getElementById('completionContainer');
  const headerStatusText = document.getElementById('headerStatusText');

  // Timer Digits & Cards
  const digitHours = document.getElementById('digitHours');
  const digitMinutes = document.getElementById('digitMinutes');
  const digitSeconds = document.getElementById('digitSeconds');

  // Progress Bar Elements
  const progressFill = document.getElementById('progressFill');
  const progressPercentage = document.getElementById('progressPercentage');
  const startTimeLabel = document.getElementById('startTimeLabel');
  const targetTimeLabel = document.getElementById('targetTimeLabel');

  // Announcement Overlay Elements
  const announcementOverlay = document.getElementById('announcementOverlay');

  // Reset Modal Elements & Controls
  const resetConfirmModal = document.getElementById('resetConfirmModal');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  const confirmResetBtn = document.getElementById('confirmResetBtn');
  const bottomResetBtn = document.getElementById('bottomResetBtn');

  // Top Controls
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const eventModeBtn = document.getElementById('eventModeBtn');
  const eventModeIcon = document.getElementById('eventModeIcon');
  const relaunchBtn = document.getElementById('relaunchBtn');

  // Local Storage Keys
  const STORAGE_KEYS = {
    STARTED_AT: 'sih_event_started_at',
    END_AT: 'sih_event_end_at',
    STATUS: 'sih_event_status'
  };

  // State Trackers
  let appState = 'NOT_STARTED'; // NOT_STARTED, RUNNING, COMPLETED
  let lastDisplayedTotalSeconds = null;
  let currentHours = null;
  let currentMinutes = null;
  let currentSeconds = null;

  // 1. Sound Toggle Controller
  function updateSoundUI() {
    const isMuted = window.AudioEngine.isMuted();
    if (isMuted) {
      soundIcon.className = 'fa-solid fa-volume-xmark';
      soundToggleBtn.querySelector('.btn-text').textContent = 'SOUND OFF';
      soundToggleBtn.classList.remove('control-btn-primary');
    } else {
      soundIcon.className = 'fa-solid fa-volume-high';
      soundToggleBtn.querySelector('.btn-text').textContent = 'SOUND ON';
      soundToggleBtn.classList.add('control-btn-primary');
    }
  }

  function toggleSound() {
    const currentMuted = window.AudioEngine.isMuted();
    window.AudioEngine.setMuted(!currentMuted);
    updateSoundUI();
    if (!currentMuted === false) {
      window.AudioEngine.playClickSound();
    }
  }

  // 2. Event / Fullscreen Mode Controller
  function toggleEventMode() {
    body.classList.toggle('event-mode');
    const isEventMode = body.classList.contains('event-mode');

    if (isEventMode) {
      eventModeIcon.className = 'fa-solid fa-compress';
      eventModeBtn.querySelector('.btn-text').textContent = 'EXIT EVENT MODE';

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      eventModeIcon.className = 'fa-solid fa-expand';
      eventModeBtn.querySelector('.btn-text').textContent = 'ENTER EVENT MODE';

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // 3. Formatting Helpers
  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  function formatTimeOfDay(tsSeconds) {
    if (!tsSeconds) return '--:--';
    const d = new Date(tsSeconds * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // 4. Update Live Current Date & Time Indicator (Bottom-Right)
  function updateLiveClock() {
    const liveClockText = document.getElementById('liveClockText');
    if (!liveClockText) return;
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();

    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    liveClockText.textContent = `${day} ${month} ${year} • ${formattedHours}:${minutes} ${ampm}`;
  }

  // 5. Update Timer Digits (Smooth Digits Transition)
  function updateTimerDisplay(hours, minutes, seconds) {
    if (currentHours !== hours) {
      digitHours.textContent = pad2(hours);
      digitHours.classList.remove('digit-tick');
      void digitHours.offsetWidth;
      digitHours.classList.add('digit-tick');
      currentHours = hours;
    }

    if (currentMinutes !== minutes) {
      digitMinutes.textContent = pad2(minutes);
      digitMinutes.classList.remove('digit-tick');
      void digitMinutes.offsetWidth;
      digitMinutes.classList.add('digit-tick');
      currentMinutes = minutes;
    }

    if (currentSeconds !== seconds) {
      digitSeconds.textContent = pad2(seconds);
      digitSeconds.classList.remove('digit-tick');
      void digitSeconds.offsetWidth;
      digitSeconds.classList.add('digit-tick');
      currentSeconds = seconds;

      if (appState === 'RUNNING') {
        window.AudioEngine.playTickSound();
      }
    }
  }

  // 6. Update Progress Bar
  function updateProgressBar(progressPercent, startTimeSec, targetTimeSec) {
    const pct = Math.min(100, Math.max(0, progressPercent || 0));
    progressFill.style.width = `${pct.toFixed(2)}%`;
    progressPercentage.textContent = `${pct.toFixed(1)}%`;

    startTimeLabel.textContent = `START: ${formatTimeOfDay(startTimeSec)}`;
    targetTimeLabel.textContent = `FINISH: ${formatTimeOfDay(targetTimeSec)}`;
  }

  // 7. Get Verified Stored State (With Corrupted Data Recovery)
  function getStoredState() {
    try {
      const status = localStorage.getItem(STORAGE_KEYS.STATUS);
      const startedAt = parseInt(localStorage.getItem(STORAGE_KEYS.STARTED_AT), 10);
      const endAt = parseInt(localStorage.getItem(STORAGE_KEYS.END_AT), 10);

      if (status === 'RUNNING' || status === 'COMPLETED') {
        if (!startedAt || !endAt || isNaN(startedAt) || isNaN(endAt) || endAt <= startedAt) {
          clearStoredState();
          return 'NOT_STARTED';
        }
        return status;
      }
      return 'NOT_STARTED';
    } catch (e) {
      return 'NOT_STARTED';
    }
  }

  function clearStoredState() {
    try {
      localStorage.removeItem(STORAGE_KEYS.STARTED_AT);
      localStorage.removeItem(STORAGE_KEYS.END_AT);
      localStorage.removeItem(STORAGE_KEYS.STATUS);
    } catch (e) {}
  }

  // 8. Render State & UI View Synchronization
  function renderState(status) {
    appState = status;

    if (status === 'RUNNING') {
      body.className = 'state-running';
      headerStatusText.textContent = '24-HOUR HACKATHON ACTIVE';
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');
      countdownContainer.classList.remove('hidden');

      if (bottomResetBtn) bottomResetBtn.classList.remove('hidden');

      startBtn.style.pointerEvents = 'none';
      startBtn.style.opacity = '0.5';

    } else if (status === 'COMPLETED') {
      body.className = 'state-completed';
      headerStatusText.textContent = 'HACKATHON COMPLETE';
      countdownContainer.classList.add('hidden');
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.remove('hidden');

      if (bottomResetBtn) bottomResetBtn.classList.remove('hidden');

      startBtn.style.pointerEvents = 'none';
      startBtn.style.opacity = '0.5';

      if (!body.dataset.completionTriggered) {
        body.dataset.completionTriggered = 'true';
        window.FXEngine.triggerCompletionCeremony();
        window.AudioEngine.playVictoryFanfare();
      }

    } else { // NOT_STARTED
      body.className = 'state-prelaunch';
      headerStatusText.textContent = 'PRE-LAUNCH STATE';
      prelaunchContainer.classList.remove('hidden');
      countdownContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');

      if (bottomResetBtn) bottomResetBtn.classList.add('hidden');

      startBtn.style.pointerEvents = 'auto';
      startBtn.style.opacity = '1';

      delete body.dataset.completionTriggered;
      lastDisplayedTotalSeconds = null;

      // Reset Displays
      updateTimerDisplay(24, 0, 0);
      progressFill.style.width = '0%';
      progressPercentage.textContent = '0.0%';
      startTimeLabel.textContent = 'START: --:--';
      targetTimeLabel.textContent = 'FINISH: --:--';
    }
  }

  // 9. Authoritative Timestamp-Driven Local Timer Loop
  function tickTimerLoop() {
    const status = getStoredState();
    if (status === 'NOT_STARTED') {
      if (appState !== 'NOT_STARTED') {
        renderState('NOT_STARTED');
      }
      return;
    }

    const startedAt = parseInt(localStorage.getItem(STORAGE_KEYS.STARTED_AT), 10);
    const endAt = parseInt(localStorage.getItem(STORAGE_KEYS.END_AT), 10);

    if (!startedAt || !endAt || isNaN(startedAt) || isNaN(endAt)) {
      resetCountdown();
      return;
    }

    const now = Date.now();
    const remainingMs = endAt - now;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    if (status === 'RUNNING' && remainingMs <= 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.STATUS, 'COMPLETED');
      } catch (e) {}
      renderState('COMPLETED');
      return;
    }

    if (appState !== status) {
      renderState(status);
    }

    // Update digits on second boundary
    if (remainingSeconds !== lastDisplayedTotalSeconds) {
      lastDisplayedTotalSeconds = remainingSeconds;

      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      updateTimerDisplay(hours, minutes, seconds);
    }

    // Update progress bar
    const durationMs = 24 * 60 * 60 * 1000;
    const elapsedMs = Math.max(0, Math.min(durationMs, now - startedAt));
    const progressPercent = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
    updateProgressBar(progressPercent, startedAt / 1000, endAt / 1000);
  }

  // 10. Public START HACKATHON Button — INSTANT LOCAL RESPONSE (<100ms)
  function initiatePublicLaunch() {
    if (appState !== 'NOT_STARTED') return;

    const now = Date.now();
    const durationMs = 24 * 60 * 60 * 1000;
    const endAt = now + durationMs;

    try {
      localStorage.setItem(STORAGE_KEYS.STARTED_AT, now.toString());
      localStorage.setItem(STORAGE_KEYS.END_AT, endAt.toString());
      localStorage.setItem(STORAGE_KEYS.STATUS, 'RUNNING');
    } catch (e) {}

    // 1. Instant sound
    window.AudioEngine.playLaunchCeremonySound();

    // 2. Immediate state transition (<100ms)
    renderState('RUNNING');

    // 3. Visual ceremony (Poppers, Confetti, Sparks)
    window.FXEngine.triggerLaunchCeremony();

    // 4. Tick loop immediately
    tickTimerLoop();
  }

  // 11. Reset Confirmation Modal & Action Controller
  function showResetModal() {
    if (resetConfirmModal) resetConfirmModal.classList.remove('hidden');
  }

  function hideResetModal() {
    if (resetConfirmModal) resetConfirmModal.classList.add('hidden');
  }

  function resetCountdown() {
    // 1. Stop all audio immediately
    if (window.AudioEngine && window.AudioEngine.stopAllAudio) {
      window.AudioEngine.stopAllAudio();
    }

    // 2. Dismiss overlays
    hideResetModal();
    if (announcementOverlay) announcementOverlay.classList.add('hidden');

    // 3. Clear localStorage keys
    clearStoredState();

    // 4. Return cleanly to pre-launch screen
    renderState('NOT_STARTED');
  }

  // Boot Application
  function initApp() {
    window.AudioEngine.loadMuteState();
    updateSoundUI();

    const initialStatus = getStoredState();
    renderState(initialStatus);

    // High-frequency 50ms tick loop for precision timestamp-driven countdown
    setInterval(tickTimerLoop, 50);

    // Live bottom-right current date & time indicator update
    setInterval(updateLiveClock, 1000);
    updateLiveClock();

    // Event Listeners
    startBtn.addEventListener('click', initiatePublicLaunch);
    soundToggleBtn.addEventListener('click', toggleSound);
    eventModeBtn.addEventListener('click', toggleEventMode);

    if (bottomResetBtn) bottomResetBtn.addEventListener('click', showResetModal);
    if (cancelResetBtn) cancelResetBtn.addEventListener('click', hideResetModal);
    if (confirmResetBtn) confirmResetBtn.addEventListener('click', resetCountdown);
    if (relaunchBtn) relaunchBtn.addEventListener('click', showResetModal);

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        if (!prelaunchContainer.classList.contains('hidden') || appState === 'NOT_STARTED') {
          e.preventDefault();
          initiatePublicLaunch();
        }
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleEventMode();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleSound();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
