/**
 * Core Web Vitals Reporting
 * Uses the `web-vitals` library to measure and report CLS, INP, FCP, LCP, TTFB.
 * Each metric is reported to Google Analytics 4 via the analyticsService.
 */
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';
import { trackWebVital } from '../services/analyticsService';

export const reportWebVitals = () => {
  onCLS(trackWebVital);
  onINP(trackWebVital);
  onFCP(trackWebVital);
  onLCP(trackWebVital);
  onTTFB(trackWebVital);
};
