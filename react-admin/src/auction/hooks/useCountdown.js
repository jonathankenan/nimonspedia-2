import { useState, useEffect } from 'react';

/**
 * Custom hook for managing auction countdowns
 * @param {string|Date} targetDate - The end time of the auction
 * @param {Function} onEnd - Callback when countdown reaches zero
 * @returns {Object} { timeLeft, formattedTime, isEnded }
 */
export const useCountdown = (targetDate, onEnd) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isEnded, setIsEnded] = useState(false);

    useEffect(() => {
        if (!targetDate) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const difference = target - now;

            if (difference <= 0) {
                setTimeLeft(0);
                setIsEnded(true);
                if (onEnd) onEnd();
                return 0;
            }

            setTimeLeft(difference);
            setIsEnded(false);
            return difference;
        };

        // Initial calculation
        calculateTimeLeft();

        const timer = setInterval(() => {
            const remaining = calculateTimeLeft();
            if (remaining <= 0) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    const formatTime = (ms) => {
        if (ms <= 0) return 'Selesai';

        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / 1000 / 60) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        if (days > 0) {
            return `${days}h ${hours}j ${minutes}m`;
        }
        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return {
        timeLeft,
        formattedTime: formatTime(timeLeft),
        isEnded
    };
};

export default useCountdown;
