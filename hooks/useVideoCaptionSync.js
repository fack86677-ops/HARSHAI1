import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useVideoCaptionSync
 * High-performance audio-caption synchronization hook with sub-millisecond
 * requestAnimationFrame loop and perception/audio-driver latency compensation offset.
 *
 * @param {Array} captions - Authoritative array of caption segments containing word-level timestamps.
 * @param {number} defaultOffset - Audio delay compensation in seconds (default: -0.20s).
 */
export function useVideoCaptionSync(captions = [], defaultOffset = -0.20) {
  const videoRef = useRef(null);
  const animFrameRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [effectiveTime, setEffectiveTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncOffset, setSyncOffset] = useState(defaultOffset); // -0.20s compensation

  const [activeCaption, setActiveCaption] = useState(null);
  const [activeWord, setActiveWord] = useState(null);

  // Sync calculation loop running on requestAnimationFrame
  const updateSync = useCallback(() => {
    if (!videoRef.current) return;

    const rawNow = videoRef.current.currentTime || 0;
    // Delay compensation: visual cues activate ~200ms earlier to match audio phoneme perception
    const compNow = Math.max(0, rawNow - syncOffset);

    setCurrentTime(rawNow);
    setEffectiveTime(compNow);

    // 1. Locate active caption segment
    const currentCap = captions.find(
      (c) => compNow >= (c.startTime - 0.03) && compNow <= (c.endTime + 0.05)
    ) || null;
    setActiveCaption(currentCap);

    // 2. Locate active word inside active caption
    if (currentCap) {
      const words = Array.isArray(currentCap.words) && currentCap.words.length > 0
        ? currentCap.words
        : (currentCap.text || '').split(/\s+/).filter(Boolean).map((w, i, arr) => {
            const dur = Math.max(0.1, currentCap.endTime - currentCap.startTime);
            const wDur = dur / arr.length;
            return {
              word: w,
              start: currentCap.startTime + (i * wDur),
              end: currentCap.startTime + ((i + 1) * wDur),
            };
          });

      const currentWord = words.find(
        (w) => compNow >= (w.start - 0.02) && compNow <= (w.end + 0.04)
      ) || null;
      setActiveWord(currentWord);
    } else {
      setActiveWord(null);
    }

    if (!videoRef.current.paused && !videoRef.current.ended) {
      animFrameRef.current = requestAnimationFrame(updateSync);
    }
  }, [captions, syncOffset]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(updateSync);
    };

    const onPause = () => {
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      updateSync();
    };

    const onSeeked = () => {
      updateSync();
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('timeupdate', updateSync);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', updateSync);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [updateSync]);

  const seek = useCallback((timeInSeconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, timeInSeconds);
      updateSync();
    }
  }, [updateSync]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().catch(console.warn);
    } else {
      videoRef.current.pause();
    }
  }, []);

  return {
    videoRef,
    currentTime,
    effectiveTime,
    activeCaption,
    activeWord,
    isPlaying,
    syncOffset,
    setSyncOffset,
    seek,
    togglePlay,
  };
}

export default useVideoCaptionSync;
