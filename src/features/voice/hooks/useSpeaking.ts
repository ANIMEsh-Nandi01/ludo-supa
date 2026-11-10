import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 0.01;
const SILENCE_RESET_MS = 300;
const POLL_INTERVAL_MS = 100;

/**
 * Analyses a MediaStream and returns whether the user is currently speaking.
 * Uses an AudioContext + AnalyserNode to measure RMS every 100 ms.
 * isSpeaking resets to false after 300 ms of silence.
 */
export function useSpeaking(stream: MediaStream | null): boolean {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!stream) return;

    // Create audio context and wire up the stream.
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    const dataArray = new Float32Array(analyser.fftSize);

    // Poll RMS every POLL_INTERVAL_MS ms.
    intervalRef.current = setInterval(() => {
      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS
      let sumSq = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sumSq += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSq / dataArray.length);

      if (rms > THRESHOLD) {
        // Cancel any pending silence reset.
        if (silenceTimerRef.current !== null) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsSpeaking(true);
      } else {
        // Schedule silence reset if not already pending.
        if (silenceTimerRef.current === null) {
          silenceTimerRef.current = setTimeout(() => {
            setIsSpeaking(false);
            silenceTimerRef.current = null;
          }, SILENCE_RESET_MS);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      if (silenceTimerRef.current !== null) clearTimeout(silenceTimerRef.current);
      audioCtx.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
      setIsSpeaking(false);
    };
  }, [stream]);

  return isSpeaking;
}
