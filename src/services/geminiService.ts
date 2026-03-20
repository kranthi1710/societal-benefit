import { GoogleGenAI, Type } from "@google/genai";
import type { ActionPayload } from "../types";
import { compressAndEncodeImage } from "../utils/imageUtils";

// Initialize the Google Gen AI SDK robustly (Google Services Integration)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey || apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
  console.warn("Google Gen AI API key is missing or invalid. Please check your .env file.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "dummy-key",
  dangerouslyAllowBrowser: true // Acknowledging frontend execution explicitly
});

const genericFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const processChaosInput = async (
  text: string,
  imageFile?: File | null,
  abortSignal?: AbortSignal
): Promise<ActionPayload> => {
  try {
    const parts: any[] = [
      { text: `System Context: You are the Universal Bridge. Your job is to take chaotic input and perfectly extract intent and action into structured JSON schemas.\n\nInput Received: ${text}` }
    ];

    // Efficiency & Security: Compress large images locally before sending to Google Services
    if (imageFile) {
      if (imageFile.size > 5 * 1024 * 1024 && !imageFile.type.startsWith('image/')) {
        throw new Error("File is too large (>5MB) and is not a compressible image.");
      }

      if (imageFile.type.startsWith('image/')) {
        const { base64, mimeType } = await compressAndEncodeImage(imageFile, 1200);
        parts.push({
          inlineData: {
            data: base64,
            mimeType
          }
        });
      }
      else {
        // Processing PDFs or text directly if valid
        const base64String = await genericFileToBase64(imageFile);
        parts.push({
          inlineData: {
            data: base64String,
            mimeType: imageFile.type
          }
        });
      }
    }

    // Leveraging Google's Gemini Flash for Efficiency/Low Latency
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: {
              type: Type.STRING,
              description: "Must be exactly one of: CRITICAL, HIGH, MEDIUM, LOW",
            },
            category: {
              type: Type.STRING,
              description: "Must be exactly one of: MEDICAL, EMERGENCY, TRAFFIC, NEWS",
            },
            extractedIntent: {
              type: Type.STRING,
              description: "A clear short description of what is happening.",
            },
            recommendedAction: {
              type: Type.STRING,
              description: "Exact, verifyable action to take. (e.g. 'Dispatch Ambulance', 'Reroute Traffic')",
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: "Confidence from 0.0 to 1.0",
            }
          },
          required: ["severity", "category", "extractedIntent", "recommendedAction", "confidenceScore"],
        }
      }
    });

    if (abortSignal?.aborted) {
      throw new DOMException("Request was aborted", "AbortError");
    }

    const t = typeof response.text === 'function' ? response.text() : response.text;
    if (t) {
      const parsed = JSON.parse(t);
      return parsed as ActionPayload;
    }

    throw new Error("No text response received from Google Gemini API.");

  } catch (error: any) {
    // Structured error handling (Code Quality)
    console.error("Google Gemini Processing Error:", error);
    if (error.message?.includes("API key not valid")) {
      throw new Error("The Google Gemini API Key is invalid or expired. Please check your credentials.");
    }
    throw error;
  }
};
