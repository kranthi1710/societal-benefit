/**
 * Google Analytics 4 (GA4) Service
 * Provides typed helper functions to interact with the GA4 gtag API.
 * All events are namespaced under the Universal Bridge app context.
 */

// Declare gtag as a global to avoid TypeScript errors (loaded via index.html script)
declare global {
  function gtag(...args: unknown[]): void;
  interface Window {
    dataLayer: unknown[];
  }
}

/**
 * Safely calls gtag. If the script hasn't loaded yet, this is a no-op.
 */
const safeGtag = (...args: unknown[]) => {
  if (typeof gtag === 'function') {
    gtag(...args);
  }
};

/**
 * Track a page view. Call on initial mount and on any client-side navigation.
 */
export const trackPageView = (pagePath: string = window.location.pathname) => {
  safeGtag('event', 'page_view', {
    page_path: pagePath,
    page_title: document.title,
  });
};

/**
 * Track a named custom event with optional parameters.
 */
export const trackEvent = (
  eventName: string,
  params: Record<string, string | number | boolean> = {}
) => {
  safeGtag('event', eventName, params);
};

/**
 * Track an application error and report it to GA4 as an exception.
 */
export const trackError = (description: string, fatal: boolean = false) => {
  safeGtag('event', 'exception', {
    description,
    fatal,
  });
};

/**
 * Track a Core Web Vital metric and report it to GA4.
 * Used by the web-vitals integration to report LCP, CLS, FID, FCP, TTFB.
 */
export const trackWebVital = (metric: {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}) => {
  safeGtag('event', metric.name, {
    // GA4 custom event parameters for Web Vitals
    event_category: 'Web Vitals',
    event_label: metric.id,
    value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    non_interaction: true,
  });
};
