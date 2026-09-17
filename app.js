(() => {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const videos = [...document.querySelectorAll('.feature-video-grid video')];
  const manuallyPaused = new WeakSet();

  function buttonFor(video) {
    return video.closest('.feature-card').querySelector('.video-toggle');
  }

  function syncButton(video) {
    const button = buttonFor(video);
    const playing = !video.paused && !video.ended;
    button.textContent = playing ? 'Pause video' : 'Play video';
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${button.dataset.title} demo video`);
  }

  function play(video) {
    const result = video.play();
    if (result && typeof result.catch === 'function') {
      result.catch(() => syncButton(video));
    }
  }

  videos.forEach(video => {
    const button = buttonFor(video);
    video.muted = true;
    video.addEventListener('play', () => syncButton(video));
    video.addEventListener('pause', () => syncButton(video));
    video.addEventListener('error', () => {
      button.textContent = 'Video unavailable';
      button.disabled = true;
    });
    button.addEventListener('click', () => {
      if (video.paused) {
        manuallyPaused.delete(video);
        play(video);
      } else {
        manuallyPaused.add(video);
        video.pause();
      }
    });
    if (motionPreference.matches) {
      video.autoplay = false;
      video.pause();
    } else {
      play(video);
    }
    syncButton(video);
  });

  function respondToMotionPreference() {
    videos.forEach(video => {
      if (motionPreference.matches) {
        video.autoplay = false;
        video.pause();
      } else if (!manuallyPaused.has(video)) {
        video.autoplay = true;
        play(video);
      }
    });
  }

  if (typeof motionPreference.addEventListener === 'function') {
    motionPreference.addEventListener('change', respondToMotionPreference);
  } else {
    motionPreference.addListener(respondToMotionPreference);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !motionPreference.matches) {
      videos.forEach(video => {
        if (!manuallyPaused.has(video) && video.paused) play(video);
      });
    }
  });
})();
