import "server-only";

export const AI_KEY = process.env.AI_KEY;
if (AI_KEY === undefined) {
  throw new Error("Missing AI key");
}

export const AI_URL = process.env.AI_URL;
if (AI_URL === undefined) {
  throw new Error("Missing AI URL");
}

export const AI_MODEL = process.env.AI_MODEL;
if (AI_MODEL === undefined) {
  throw new Error("Missing AI Model");
}

export const WEATHER_API_KEY = process.env.WEATHER_API;
if (WEATHER_API_KEY === undefined) {
  throw new Error("Missing Weather API Key");
}

const RAPID_KEY = process.env.RAPID_API_KEY;
if (RAPID_KEY === undefined) {
  throw new Error("Missing Rapid API Key");
}
export const RAPID_API_KEY = RAPID_KEY;

export const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY;
if (GEOAPIFY_KEY === undefined) {
  throw new Error("Missing GEOAPIFY API Key");
}
