import { RunContext } from "@openai/agents";
import { ErrorMessages, FetchError } from "../type";

export function toolErrorHandler(toolName: string, messages: ErrorMessages) {
  return (_: RunContext<unknown>, error: Error | unknown) => {
    if (error instanceof FetchError) {
      console.error(toolName, error.status, error.message, error.url);
      if (error.status === 401 || error.status === 402) {
        return messages.credentials;
      }
      if (error.retryable) {
        return messages.retryable;
      }
      return messages.generic;
    }
    console.error(toolName, error);
    return messages.generic;
  };
}

export const TOOL_ERRORS = {
  get_lat_lon: {
    credentials:
      "City lookup is unavailable: our geocoding credentials are invalid or have expired. Do not retry this tool. Use your own knowledge of the city's approximate coordinates so the weather, hotel, and attraction lookups can still run.",
    retryable:
      "The geocoding service is temporarily unavailable. Retry once. If it fails again, use your own knowledge of the city's approximate coordinates so the weather, hotel, and attraction lookups can still run.",
    generic:
      "City lookup failed for that query. Try once more with a different spelling, or with a larger nearby city. If that also fails, continue with your own knowledge of the location.",
  },
  get_weather: {
    credentials:
      "Weather is unavailable: our weather credentials are invalid or have expired. Do not retry this tool. Continue planning and describe the typical seasonal conditions for the location and dates instead of a forecast.",
    retryable:
      "The weather service is temporarily unavailable. Retry once. If it fails again, describe the typical seasonal conditions for the location and dates instead of a forecast.",
    generic:
      "Weather lookup failed. Do not retry. Continue planning and describe the typical seasonal conditions for the location and dates, making clear it is not a live forecast.",
  },
  search_airport: {
    credentials:
      "Airport lookup is unavailable: our Google Flights credentials are invalid or have expired. Do not retry this tool. Use the IATA code you already know for the city and continue.",
    retryable:
      "The airport lookup service is temporarily unavailable. Retry once. If it fails again, use the IATA code you already know for the city and continue.",
    generic:
      "Airport lookup failed for that query. Try once more with just the city name. If that also fails, use the IATA code you already know for the city.",
  },
  get_flights: {
    credentials:
      "Flight search is unavailable: our Google Flights credentials are invalid or have expired. Do not retry this tool. Give the user a rough price and duration estimate from your own knowledge, state plainly that it is an estimate and not a live quote, and do not invent a flight reference.",
    retryable:
      "The flight search service is temporarily unavailable. Retry once. If it fails again, give a rough price and duration estimate, state plainly that it is an estimate and not a live quote, and do not invent a flight reference.",
    generic:
      "Flight search failed. Do not retry. Give the user a rough price and duration estimate, state plainly that it is an estimate and not a live quote, and do not invent a flight reference.",
  },
  get_hotels: {
    credentials:
      "Hotel search is unavailable: our accommodation credentials are invalid or have expired. Do not retry this tool. Give the user a rough nightly rate estimate from your own knowledge, state plainly that it is an estimate, and do not invent a hotel ID.",
    retryable:
      "The hotel search service is temporarily unavailable. Retry once. If it fails again, give a rough nightly rate estimate, state plainly that it is an estimate, and do not invent a hotel ID.",
    generic:
      "Hotel search failed. Do not retry. Give the user a rough nightly rate estimate, state plainly that it is an estimate, and do not invent a hotel ID.",
  },
  get_attractions: {
    credentials:
      "Attraction search is unavailable: our places credentials are invalid or have expired. Do not retry this tool. Recommend well-known attractions for the location from your own knowledge, and only include a Wikipedia slug you are confident is correct.",
    retryable:
      "The attraction search service is temporarily unavailable. Retry once. If it fails again, recommend well-known attractions for the location from your own knowledge, and only include a Wikipedia slug you are confident is correct.",
    generic:
      "Attraction search failed. Do not retry. Recommend well-known attractions for the location from your own knowledge, and only include a Wikipedia slug you are confident is correct.",
  },
} as const satisfies Record<string, ErrorMessages>;
