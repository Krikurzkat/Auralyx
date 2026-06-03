/**
 * Performance Optimization Utilities
 * Detects device capabilities and provides optimized settings
 */
/**
 * Detect if device is mobile/tablet
 */
export const isMobileDevice = () => {
    if (typeof window === 'undefined')
        return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1280;
};
/**
 * Detect if device is low-end (based on hardware concurrency and memory)
 */
export const isLowEndDevice = () => {
    if (typeof window === 'undefined')
        return false;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = navigator.deviceMemory || 4;
    // Consider low-end if less than 4 cores or less than 4GB RAM
    return hardwareConcurrency < 4 || deviceMemory < 4;
};
/**
 * Detect if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
    if (typeof window === 'undefined')
        return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
/**
 * Get optimized performance settings based on device capabilities
 */
export const getPerformanceSettings = () => {
    const mobile = isMobileDevice();
    const lowEnd = isLowEndDevice();
    const reducedMotion = prefersReducedMotion();
    // Desktop with good hardware
    if (!mobile && !lowEnd && !reducedMotion) {
        return {
            enableBlur: true,
            enableParticles: true,
            enableHeavyAnimations: true,
            enableShadows: true,
            maxBlurRadius: 40,
            animationDuration: 1,
            enableWillChange: true,
        };
    }
    // Tablet or mid-range device
    if (!mobile && !lowEnd) {
        return {
            enableBlur: true,
            enableParticles: false,
            enableHeavyAnimations: false,
            enableShadows: true,
            maxBlurRadius: 16,
            animationDuration: 0.8,
            enableWillChange: false,
        };
    }
    // Mobile or low-end device
    return {
        enableBlur: false,
        enableParticles: false,
        enableHeavyAnimations: false,
        enableShadows: false,
        maxBlurRadius: 0,
        animationDuration: 0.5,
        enableWillChange: false,
    };
};
/**
 * Throttle function for performance-critical operations
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};
/**
 * Debounce function for performance-critical operations
 */
export const debounce = (func, wait) => {
    let timeout;
    return function (...args) {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
/**
 * Request idle callback polyfill
 */
export const requestIdleCallback = (callback) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        return window.requestIdleCallback(callback);
    }
    return globalThis.setTimeout(callback, 1);
};
/**
 * Cancel idle callback polyfill
 */
export const cancelIdleCallback = (id) => {
    if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
    }
    else {
        globalThis.clearTimeout(id);
    }
};
/**
 * Optimize image loading with lazy loading and proper sizing
 */
export const getOptimizedImageProps = (src, alt) => {
    return {
        src,
        alt,
        loading: 'lazy',
        decoding: 'async',
    };
};
/**
 * Check if browser supports backdrop-filter
 */
export const supportsBackdropFilter = () => {
    if (typeof window === 'undefined')
        return false;
    return CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
};
