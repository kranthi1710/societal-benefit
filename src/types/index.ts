export interface ActionPayload {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: "MEDICAL" | "EMERGENCY" | "TRAFFIC" | "NEWS";
  extractedIntent: string;
  recommendedAction: string;
  confidenceScore: number;
}
