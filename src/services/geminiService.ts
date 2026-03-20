import { GoogleGenAI, Type } from "@google/genai";
import type { ActionPayload } from "../types";
import { compressAndEncodeImage } from "../utils/imageUtils";

// Initialize the Google Gen AI SDK robustly (Google Services Integration)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey || apiKey === "AIzaSyBN7MMz8rd0PTyMkBSSTJzac3JEp_Hxaas") {
  console.warn("Google Gen AI API key is missing or invalid. Please check your .env file.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "dummy-key"
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

const SCHEMA_CONFIG = {
  systemInstruction: "You are the Universal Bridge. Your critical job is to analyze messy, chaotic human input (such as injuries, traffic accidents, emergencies, or raw logs) and extract the core intent into strictly structured, life-saving system JSON actions. Be highly precise and deterministic.",
  temperature: 0.1,
  topK: 32,
  topP: 0.95,
  safetySettings: [
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any, threshold: "BLOCK_ONLY_HIGH" as any },
    { category: "HARM_CATEGORY_HARASSMENT" as any, threshold: "BLOCK_ONLY_HIGH" as any }
  ],
  responseMimeType: "application/json",
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      severity: { type: Type.STRING, description: "Must be exactly one of: CRITICAL, HIGH, MEDIUM, LOW" },
      category: { type: Type.STRING, description: "Must be exactly one of: MEDICAL, EMERGENCY, TRAFFIC, NEWS" },
      extractedIntent: { type: Type.STRING, description: "A clear short description of what is happening." },
      recommendedAction: { type: Type.STRING, description: "Exact, verifiable action to take." },
      confidenceScore: { type: Type.NUMBER, description: "Confidence from 0.0 to 1.0" }
    },
    required: ["severity", "category", "extractedIntent", "recommendedAction", "confidenceScore"],
  }
};

/**
 * Processes chaotic input using Gemini's streaming API.
 * onStream is called with partial text as the model generates tokens.
 */
export const processChaosInput = async (
  text: string,
  imageFile?: File | null,
  abortSignal?: AbortSignal,
  onStream?: (partial: string) => void
): Promise<ActionPayload> => {
  try {
    const parts: any[] = [{ text }];

    // Efficiency & Security: Compress large images locally before sending to Google Services
    if (imageFile) {
      if (imageFile.size > 5 * 1024 * 1024 && !imageFile.type.startsWith('image/')) {
        throw new Error("File is too large (>5MB) and is not a compressible image.");
      }
      if (imageFile.type.startsWith('image/')) {
        const { base64, mimeType } = await compressAndEncodeImage(imageFile, 1200);
        parts.push({ inlineData: { data: base64, mimeType } });
      } else {
        const base64String = await genericFileToBase64(imageFile);
        parts.push({ inlineData: { data: base64String, mimeType: imageFile.type } });
      }
    }

    // Use Gemini streaming for a richer integration — streams tokens as the model thinks
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: SCHEMA_CONFIG
    });

    let accumulated = '';

    for await (const chunk of stream) {
      if (abortSignal?.aborted) {
        throw new DOMException("Request was aborted", "AbortError");
      }
      const chunkText = chunk.text ?? '';
      accumulated += chunkText;
      // Notify caller of partial streaming content
      if (onStream && chunkText) {
        onStream(accumulated);
      }
    }

    if (!accumulated) {
      throw new Error("No response received from Google Gemini API.");
    }

    const parsed = JSON.parse(accumulated);
    return parsed as ActionPayload;

  } catch (error: any) {
    console.error("Google Gemini Processing Error:", error);

    const errMsg = error.message || "";
    if (errMsg.includes("leaked") || errMsg.includes("PERMISSION_DENIED") || error.code === 403 || error.status === 403) {
      throw new Error(
        "🚨 URGENT SECURITY ALERT: API KEY LEAKED\n\n" +
        "Google's security scanners detected that your Gemini API key was exposed. " +
        "Google has automatically disabled this key.\n\n" +
        "Fix: Go to Google AI Studio → delete the key → generate a new one → update .env → ensure .env is in .gitignore."
      );
    }

    if (errMsg.includes("API key not valid")) {
      throw new Error("The Google Gemini API Key is invalid or expired. Please check your credentials.");
    }

    if (error.name === 'AbortError') throw error;

    throw new Error(errMsg || "An unexpected error occurred while communicating with Google services.");
  }
};
