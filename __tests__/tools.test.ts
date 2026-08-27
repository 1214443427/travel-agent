//@vitest-environment node

import { getFlights, getLatLon, getWeather, searchAirport } from "@/app/utils/tools";
import { RunContext } from "@openai/agents";
import { describe, expect, test } from "vitest";
import { server } from "./test-setup";
import { http, HttpResponse } from "msw";
import { testUpstreamFailures } from "./helper/toolFailures";
import { TOOL_ERRORS } from "@/app/utils/toolErrors";
import { BookingHandle } from "@/app/type";

describe("get_lat_lon tool", () => {
  test("The tool correctly filters API data down to the useful fields. ", async () => {
    const result = await getLatLon.invoke(
      new RunContext({}),
      JSON.stringify({ city: "New York", countryCode: null }),
    );
    expect(result).toEqual([
      {
        name: "New York",
        lat: 40.7127281,
        lon: -74.0060152,
        country: "US",
        state: "New York",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("纽约"); // Should not contain foreign names.
  });

  testUpstreamFailures({
    tool: getLatLon,
    endpoint: "https://api.openweathermap.org/geo/1.0/direct",
    args: { city: "New York", countryCode: null },
    messages: {
      credentials: TOOL_ERRORS.get_lat_lon.credentials,
      retryable: TOOL_ERRORS.get_lat_lon.retryable,
      generic: TOOL_ERRORS.get_lat_lon.generic,
    },
  });
});

describe("get_weather tool", () => {
  test("The tool should return filtered data", async () => {
    const result = await getWeather.invoke(
      new RunContext({}),
      JSON.stringify({ lat: 10.99, lon: 44.34, unit: "metric" }),
    );
    expect(result).toEqual({
      weather: "Clouds",
      weatherDescription: "few clouds",
      temp: 31.5,
    });
    expect(result).not.toHaveProperty("base");
    expect(result).not.toHaveProperty("sys");
  });

  testUpstreamFailures({
    tool: getWeather,
    endpoint: "https://api.openweathermap.org/data/2.5/weather",
    args: { lat: 10.99, lon: 44.34, unit: "metric" },
    messages: {
      credentials: TOOL_ERRORS.get_weather.credentials,
      retryable: TOOL_ERRORS.get_weather.retryable,
      generic: TOOL_ERRORS.get_weather.generic,
    },
  });
});

describe("search_airport tool", () => {
  test("The tool should return filtered data", async () => {
    const result = await searchAirport.invoke(
      new RunContext({}),
      JSON.stringify({ query: "Los Angeles" }),
    );
    expect(result).toHaveProperty("data[0].title", "Los Angeles, California");
    expect(result).toHaveProperty("data[0].list[0].id", "LAX");
    expect(result).not.toHaveProperty("status");
  });
  testUpstreamFailures({
    tool: searchAirport,
    endpoint: "https://google-flights2.p.rapidapi.com/api/v1/searchAirport",
    args: { query: "Los Angeles" },
    messages: {
      credentials: TOOL_ERRORS.search_airport.credentials,
      retryable: TOOL_ERRORS.search_airport.retryable,
      generic: TOOL_ERRORS.search_airport.generic,
    },
  });
});

describe("search_airport tool", () => {
  test("The tool should return filtered data", async () => {
    const refs = new Map<string, BookingHandle>();
    const result = await getFlights.invoke(
      new RunContext({ refs: refs }),
      JSON.stringify({
        departure: "YVR",
        arrival: "PEK",
        departureDate: "2026-08-30",
        returningDate: "2026-09-18",
        personCount: 1,
        currency: "USD",
      }),
    );
    expect(result[0]).toHaveProperty("departureTime", "30-08-2026 12:55 AM");
    expect(result[0]).toHaveProperty("arrivalTime", "31-08-2026 09:40 AM");
    expect(result[0]).not.toHaveProperty("status");
  });
  testUpstreamFailures({
    tool: getFlights,
    endpoint: "https://google-flights2.p.rapidapi.com/api/v1/searchFlights",
    args: {
      departure: "YVR",
      arrival: "PEK",
      departureDate: "2026-08-30",
      returningDate: "2026-09-18",
      personCount: 1,
      currency: "USD",
    },
    messages: {
      credentials: TOOL_ERRORS.get_flights.credentials,
      retryable: TOOL_ERRORS.get_flights.retryable,
      generic: TOOL_ERRORS.get_flights.generic,
    },
  });
});
