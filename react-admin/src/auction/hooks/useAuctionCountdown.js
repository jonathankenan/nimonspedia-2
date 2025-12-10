import { useState, useEffect, useRef } from 'react';

/**
 * Hook countdown untuk auction
 * @param {number|Date} targetTime - timestamp/Date akhir countdown
 * @param {function} onEnd - callback saat countdown selesai
 */
export const useAuctionCountdown = (targetTime, onEnd) => {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  const start = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          if (onEnd) onEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const reset = (newTargetTime) => {
    const diff = Math.ceil((newTargetTime - Date.now()) / 1000);
    setSeconds(diff > 0 ? diff : 0);
    start();
  };

  useEffect(() => {
    if (!targetTime) return;
    const diff = Math.ceil((targetTime - Date.now()) / 1000);
    setSeconds(diff > 0 ? diff : 0);
    start();

    return () => clearInterval(intervalRef.current);
  }, [targetTime]);

  return {
    seconds,
    formattedTime: `${seconds}s`,
    reset
  };
};
