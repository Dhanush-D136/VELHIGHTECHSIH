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
  const topResetBtn = document.getElementById('topResetBtn');

  // Single Symbol Floating Control Menu Elements
  const bottomControlWrapper = document.getElementById('bottomControlWrapper');
  const bottomMenuPopover = document.getElementById('bottomMenuPopover');
  const controlToggleBtn = document.getElementById('controlToggleBtn');

  // Interactive Control Bar Buttons
  const pauseResumeBtn = document.getElementById('pauseResumeBtn');
  const pauseResumeIcon = document.getElementById('pauseResumeIcon');
  const pauseResumeText = document.getElementById('pauseResumeText');
  const openEditModalBtn = document.getElementById('openEditModalBtn');

  // Edit Time Modal Elements
  const editTimeModal = document.getElementById('editTimeModal');
  const editModalHours = document.getElementById('editModalHours');
  const editModalMinutes = document.getElementById('editModalMinutes');
  const editModalSeconds = document.getElementById('editModalSeconds');
  const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');
  const resetModalDefaultBtn = document.getElementById('resetModalDefaultBtn');
  const applyEditModalBtn = document.getElementById('applyEditModalBtn');
  const quickAddPills = document.querySelectorAll('.quick-add-pill');

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
    STATUS: 'sih_event_status',
    PAUSED_AT: 'sih_event_paused_at',
    REMAINING_WHEN_PAUSED: 'sih_event_remaining_when_paused',
    TOTAL_DURATION: 'sih_event_total_duration'
  };

  // Cross-Tab Real-time Broadcast Channel
  const broadcastChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('sih_countdown_channel') : null;

  // State Trackers
  let appState = 'NOT_STARTED'; // NOT_STARTED, RUNNING, PAUSED, COMPLETED
  let lastDisplayedTotalSeconds = null;
  let currentHours = null;
  let currentMinutes = null;
  let currentSeconds = null;
  const DEFAULT_24H_MS = 24 * 60 * 60 * 1000;

  // 1. Broadcast Helper for Instant Multi-Tab Sync
  function notifyStateChange() {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'STATE_UPDATED',
        timestamp: Date.now()
      });
    }
  }

  // 2. Sound Toggle Controller
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

  // 3. Event / Fullscreen Mode Controller
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

  // 4. Formatting Helpers
  function pad2(num) {
    return String(Math.max(0, num)).padStart(2, '0');
  }

  function formatTimeOfDay(tsSeconds) {
    if (!tsSeconds || isNaN(tsSeconds)) return '--:--';
    const d = new Date(tsSeconds * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // 5. Update Live Current Date & Time Indicator (Bottom-Right)
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

  // 6. Update Timer Digits (Smooth Digits Transition)
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

  // 7. Update Progress Bar
  function updateProgressBar(progressPercent, startTimeSec, targetTimeSec) {
    const pct = Math.min(100, Math.max(0, progressPercent || 0));
    progressFill.style.width = `${pct.toFixed(2)}%`;
    progressPercentage.textContent = `${pct.toFixed(1)}%`;

    startTimeLabel.textContent = `START: ${formatTimeOfDay(startTimeSec)}`;
    targetTimeLabel.textContent = `FINISH: ${formatTimeOfDay(targetTimeSec)}`;
  }

  // 8. Get Verified Stored State (With Corrupted Data Recovery)
  function getStoredState() {
    try {
      const status = localStorage.getItem(STORAGE_KEYS.STATUS);
      if (status === 'RUNNING' || status === 'PAUSED' || status === 'COMPLETED') {
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
      localStorage.removeItem(STORAGE_KEYS.PAUSED_AT);
      localStorage.removeItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED);
      localStorage.removeItem(STORAGE_KEYS.TOTAL_DURATION);
    } catch (e) {}
  }

  // Popover Menu Controls
  function closeControlMenu() {
    if (bottomMenuPopover) bottomMenuPopover.classList.add('hidden');
    if (controlToggleBtn) controlToggleBtn.classList.remove('active');
  }

  function toggleControlMenu(e) {
    if (e) e.stopPropagation();
    if (!bottomMenuPopover || !controlToggleBtn) return;
    const isHidden = bottomMenuPopover.classList.contains('hidden');
    if (isHidden) {
      bottomMenuPopover.classList.remove('hidden');
      controlToggleBtn.classList.add('active');
    } else {
      closeControlMenu();
    }
  }

  // 9. Render State & UI View Synchronization
  function renderState(status) {
    appState = status;
    closeControlMenu();

    if (status === 'RUNNING') {
      body.className = 'state-running';
      headerStatusText.textContent = '24-HOUR HACKATHON ACTIVE';
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');
      countdownContainer.classList.remove('hidden');

      if (controlToggleBtn) controlToggleBtn.classList.remove('hidden');
      if (pauseResumeBtn) {
        pauseResumeIcon.className = 'fa-solid fa-pause';
        if (pauseResumeText) pauseResumeText.textContent = 'PAUSE';
      }

      startBtn.style.pointerEvents = 'none';
      startBtn.style.opacity = '0.5';

    } else if (status === 'PAUSED') {
      body.className = 'state-running state-paused';
      headerStatusText.textContent = 'COUNTDOWN PAUSED';
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');
      countdownContainer.classList.remove('hidden');

      if (controlToggleBtn) controlToggleBtn.classList.remove('hidden');
      if (pauseResumeBtn) {
        pauseResumeIcon.className = 'fa-solid fa-play';
        if (pauseResumeText) pauseResumeText.textContent = 'CONTINUE';
      }

      startBtn.style.pointerEvents = 'none';
      startBtn.style.opacity = '0.5';

    } else if (status === 'COMPLETED') {
      body.className = 'state-completed';
      headerStatusText.textContent = 'HACKATHON COMPLETE';
      countdownContainer.classList.add('hidden');
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.remove('hidden');

      if (controlToggleBtn) controlToggleBtn.classList.remove('hidden');

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

      if (controlToggleBtn) controlToggleBtn.classList.add('hidden');

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

  // 10. Authoritative Timestamp-Driven Local Timer Loop
  function tickTimerLoop() {
    const status = getStoredState();
    if (status === 'NOT_STARTED') {
      if (appState !== 'NOT_STARTED') {
        renderState('NOT_STARTED');
      }
      return;
    }

    if (appState !== status) {
      renderState(status);
    }

    const totalDurationMs = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_DURATION), 10) || DEFAULT_24H_MS;

    if (status === 'PAUSED') {
      const remainingMs = parseInt(localStorage.getItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED), 10) || 0;
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      updateTimerDisplay(hours, minutes, seconds);

      const elapsedMs = Math.max(0, totalDurationMs - remainingMs);
      const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
      const startedAt = parseInt(localStorage.getItem(STORAGE_KEYS.STARTED_AT), 10);
      updateProgressBar(progressPercent, startedAt ? startedAt / 1000 : null, null);
      return;
    }

    // Status is RUNNING or COMPLETED
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
      notifyStateChange();
      return;
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
    const elapsedMs = Math.max(0, Math.min(totalDurationMs, now - startedAt));
    const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
    updateProgressBar(progressPercent, startedAt / 1000, endAt / 1000);
  }

  // 11. Public START HACKATHON Button — INSTANT LOCAL RESPONSE (<100ms)
  function initiatePublicLaunch(durationMs) {
    if (appState !== 'NOT_STARTED' && appState !== 'COMPLETED') return;

    const dur = (typeof durationMs === 'number' && durationMs > 0) ? durationMs : DEFAULT_24H_MS;
    const now = Date.now();
    const endAt = now + dur;

    try {
      localStorage.setItem(STORAGE_KEYS.STARTED_AT, now.toString());
      localStorage.setItem(STORAGE_KEYS.END_AT, endAt.toString());
      localStorage.setItem(STORAGE_KEYS.TOTAL_DURATION, dur.toString());
      localStorage.setItem(STORAGE_KEYS.STATUS, 'RUNNING');
      localStorage.removeItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED);
      localStorage.removeItem(STORAGE_KEYS.PAUSED_AT);
    } catch (e) {}

    // 1. Instant sound
    window.AudioEngine.playLaunchCeremonySound();

    // 2. Immediate state transition (<100ms)
    renderState('RUNNING');

    // 3. Visual ceremony
    window.FXEngine.triggerLaunchCeremony();

    // 4. Tick & Broadcast
    notifyStateChange();
    tickTimerLoop();
  }

  // 12. PAUSE / CONTINUE (RESUME) CONTROLLER
  function togglePauseResume() {
    const status = getStoredState();

    if (status === 'RUNNING') {
      const endAt = parseInt(localStorage.getItem(STORAGE_KEYS.END_AT), 10);
      const now = Date.now();
      const remainingMs = Math.max(0, endAt - now);

      try {
        localStorage.setItem(STORAGE_KEYS.STATUS, 'PAUSED');
        localStorage.setItem(STORAGE_KEYS.PAUSED_AT, now.toString());
        localStorage.setItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED, remainingMs.toString());
      } catch (e) {}

      renderState('PAUSED');
      notifyStateChange();
      tickTimerLoop();

    } else if (status === 'PAUSED') {
      const remainingMs = parseInt(localStorage.getItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED), 10) || 0;
      const totalDurationMs = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_DURATION), 10) || DEFAULT_24H_MS;
      const now = Date.now();
      const endAt = now + remainingMs;
      const startedAt = now - Math.max(0, totalDurationMs - remainingMs);

      try {
        localStorage.setItem(STORAGE_KEYS.STATUS, 'RUNNING');
        localStorage.setItem(STORAGE_KEYS.STARTED_AT, startedAt.toString());
        localStorage.setItem(STORAGE_KEYS.END_AT, endAt.toString());
        localStorage.removeItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED);
        localStorage.removeItem(STORAGE_KEYS.PAUSED_AT);
      } catch (e) {}

      renderState('RUNNING');
      notifyStateChange();
      tickTimerLoop();
    }
  }

  // 13. EDIT & ADJUST TIME MODAL CONTROLLER
  function openEditModal() {
    let remSeconds = 24 * 3600;
    const status = getStoredState();

    if (status === 'RUNNING') {
      const endAt = parseInt(localStorage.getItem(STORAGE_KEYS.END_AT), 10);
      remSeconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    } else if (status === 'PAUSED') {
      const remMs = parseInt(localStorage.getItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED), 10) || 0;
      remSeconds = Math.max(0, Math.ceil(remMs / 1000));
    }

    const h = Math.floor(remSeconds / 3600);
    const m = Math.floor((remSeconds % 3600) / 60);
    const s = remSeconds % 60;

    if (editModalHours) editModalHours.value = h;
    if (editModalMinutes) editModalMinutes.value = pad2(m);
    if (editModalSeconds) editModalSeconds.value = pad2(s);

    if (editTimeModal) editTimeModal.classList.remove('hidden');
  }

  function hideEditModal() {
    if (editTimeModal) editTimeModal.classList.add('hidden');
  }

  function applyEditTimeModal() {
    const h = parseInt(editModalHours.value || 0, 10);
    const m = parseInt(editModalMinutes.value || 0, 10);
    const s = parseInt(editModalSeconds.value || 0, 10);

    const targetRemainingMs = Math.max(0, (h * 3600 + m * 60 + s) * 1000);
    if (targetRemainingMs === 0) {
      resetCountdown();
      hideEditModal();
      return;
    }

    const currentStatus = getStoredState();
    const now = Date.now();
    const existingTotalDur = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_DURATION), 10) || DEFAULT_24H_MS;
    const newTotalDuration = Math.max(existingTotalDur, targetRemainingMs);

    if (currentStatus === 'RUNNING') {
      const newEndAt = now + targetRemainingMs;
      const newStartedAt = now - Math.max(0, newTotalDuration - targetRemainingMs);

      try {
        localStorage.setItem(STORAGE_KEYS.STARTED_AT, newStartedAt.toString());
        localStorage.setItem(STORAGE_KEYS.END_AT, newEndAt.toString());
        localStorage.setItem(STORAGE_KEYS.TOTAL_DURATION, newTotalDuration.toString());
      } catch (e) {}

      renderState('RUNNING');

    } else if (currentStatus === 'PAUSED') {
      const newEndAt = now + targetRemainingMs;
      const newStartedAt = now - Math.max(0, newTotalDuration - targetRemainingMs);

      try {
        localStorage.setItem(STORAGE_KEYS.STATUS, 'RUNNING');
        localStorage.setItem(STORAGE_KEYS.STARTED_AT, newStartedAt.toString());
        localStorage.setItem(STORAGE_KEYS.END_AT, newEndAt.toString());
        localStorage.setItem(STORAGE_KEYS.TOTAL_DURATION, newTotalDuration.toString());
        localStorage.removeItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED);
        localStorage.removeItem(STORAGE_KEYS.PAUSED_AT);
      } catch (e) {}

      renderState('RUNNING');

    } else { // NOT_STARTED or COMPLETED
      initiatePublicLaunch(targetRemainingMs);
    }

    hideEditModal();
    notifyStateChange();
    tickTimerLoop();
  }

  function quickAddMinutes(addMins) {
    const addMs = addMins * 60 * 1000;

    // If modal is open, adjust input fields directly
    if (editTimeModal && !editTimeModal.classList.contains('hidden')) {
      const curH = parseInt(editModalHours.value || 0, 10);
      const curM = parseInt(editModalMinutes.value || 0, 10);
      const curS = parseInt(editModalSeconds.value || 0, 10);
      let totalSec = Math.max(0, (curH * 3600 + curM * 60 + curS) + (addMins * 60));

      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      editModalHours.value = h;
      editModalMinutes.value = pad2(m);
      editModalSeconds.value = pad2(s);
      return;
    }

    // Direct apply if modal is not open
    const status = getStoredState();
    if (status === 'RUNNING') {
      const currentEnd = parseInt(localStorage.getItem(STORAGE_KEYS.END_AT), 10) || Date.now();
      const currentTotal = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_DURATION), 10) || DEFAULT_24H_MS;
      const newEnd = Math.max(Date.now(), currentEnd + addMs);
      const newTotal = Math.max(currentTotal, currentTotal + addMs);

      try {
        localStorage.setItem(STORAGE_KEYS.END_AT, newEnd.toString());
        localStorage.setItem(STORAGE_KEYS.TOTAL_DURATION, newTotal.toString());
      } catch (e) {}

      notifyStateChange();
      tickTimerLoop();

    } else if (status === 'PAUSED') {
      const currentRem = parseInt(localStorage.getItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED), 10) || 0;
      const newRem = Math.max(0, currentRem + addMs);

      try {
        localStorage.setItem(STORAGE_KEYS.REMAINING_WHEN_PAUSED, newRem.toString());
      } catch (e) {}

      notifyStateChange();
      tickTimerLoop();
    }
  }

  // 14. Reset Confirmation Modal & Action Controller
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
    hideEditModal();
    if (announcementOverlay) announcementOverlay.classList.add('hidden');

    // 3. Clear localStorage keys
    clearStoredState();

    // 4. Return cleanly to pre-launch screen
    renderState('NOT_STARTED');
    notifyStateChange();
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

    // Cross-tab real-time sync listeners
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        if (event && event.data && event.data.type === 'STATE_UPDATED') {
          tickTimerLoop();
        }
      };
    }
    window.addEventListener('storage', tickTimerLoop);

    // Event Listeners
    startBtn.addEventListener('click', () => initiatePublicLaunch(DEFAULT_24H_MS));
    soundToggleBtn.addEventListener('click', toggleSound);
    eventModeBtn.addEventListener('click', toggleEventMode);

    if (controlToggleBtn) controlToggleBtn.addEventListener('click', toggleControlMenu);

    if (pauseResumeBtn) pauseResumeBtn.addEventListener('click', () => {
      closeControlMenu();
      togglePauseResume();
    });
    if (openEditModalBtn) openEditModalBtn.addEventListener('click', () => {
      closeControlMenu();
      openEditModal();
    });
    if (cancelEditModalBtn) cancelEditModalBtn.addEventListener('click', hideEditModal);
    if (applyEditModalBtn) applyEditModalBtn.addEventListener('click', applyEditTimeModal);
    if (resetModalDefaultBtn) resetModalDefaultBtn.addEventListener('click', () => {
      hideEditModal();
      resetCountdown();
    });

    quickAddPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const mins = parseInt(pill.dataset.addMins, 10);
        if (!isNaN(mins)) quickAddMinutes(mins);
      });
    });

    if (topResetBtn) topResetBtn.addEventListener('click', () => {
      closeControlMenu();
      showResetModal();
    });
    if (bottomResetBtn) bottomResetBtn.addEventListener('click', () => {
      closeControlMenu();
      showResetModal();
    });
    if (cancelResetBtn) cancelResetBtn.addEventListener('click', hideResetModal);
    if (confirmResetBtn) confirmResetBtn.addEventListener('click', resetCountdown);
    if (relaunchBtn) relaunchBtn.addEventListener('click', showResetModal);

    document.addEventListener('click', (e) => {
      if (bottomControlWrapper && !bottomControlWrapper.contains(e.target)) {
        closeControlMenu();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        if (!prelaunchContainer.classList.contains('hidden') || appState === 'NOT_STARTED') {
          e.preventDefault();
          initiatePublicLaunch(DEFAULT_24H_MS);
        } else if (appState === 'RUNNING' || appState === 'PAUSED') {
          e.preventDefault();
          togglePauseResume();
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
