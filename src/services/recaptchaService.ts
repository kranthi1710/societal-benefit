/**
 * Google reCAPTCHA v3 Service
 * Silently scores user interactions without any user friction.
 * Replace VITE_RECAPTCHA_SITE_KEY in your .env with a real key from:
 * https://www.google.com/recaptcha/admin/create
 */

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

let scriptLoaded = false;

/**
 * Dynamically loads the reCAPTCHA v3 script once, then resolves.
 */
const loadRecaptchaScript = (): Promise<void> => {
  if (scriptLoaded || window.grecaptcha) {
    scriptLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => { scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('reCAPTCHA script failed to load'));
    document.head.appendChild(script);
  });
};

/**
 * Execute a reCAPTCHA v3 challenge for the given action name.
 * Returns the token string. In a backend-connected app, send this token
 * to your server for verification. Here we log/track it via GA4.
 */
export const executeRecaptcha = async (action: string): Promise<string> => {
  try {
    await loadRecaptchaScript();
    return await new Promise<string>((resolve) => {
      window.grecaptcha.ready(async () => {
        const token = await window.grecaptcha.execute(SITE_KEY, { action });
        resolve(token);
      });
    });
  } catch (err) {
    console.warn('[reCAPTCHA] Could not execute:', err);
    return '';
  }
};
