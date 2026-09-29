//@vitest-environment node

import {
  getAttractions,
  getFlights,
  getHotels,
  getLatLon,
  getNextFlight,
  getWeather,
  searchAirport,
} from "@/app/utils/tools";
import { RunContext } from "@openai/agents";
import { describe, expect, test, vi } from "vitest";
import { testUpstreamFailures } from "./helper/toolFailures";
import { TOOL_ERRORS } from "@/app/utils/toolErrors";
import { BookingHandle } from "@/app/type";
import { SAMPLE_FLIGHT_DATA } from "./testData/sampleFlightData";
import { SAMPLE_BOOK_TOKEN_FLIGHT } from "./testData/sampleFlightDataWithNextToken";

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

describe("get_flight tool", () => {
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
    expect(result[0]).toHaveProperty(
      "departureTime",
      SAMPLE_FLIGHT_DATA.data.itineraries.topFlights[0].departure_time,
    );
    expect(result[0]).toHaveProperty(
      "arrivalTime",
      SAMPLE_FLIGHT_DATA.data.itineraries.topFlights[0].arrival_time,
    );
    expect(result[0]).not.toHaveProperty("status");
    expect(JSON.stringify(result)).not.toContain("priceHistory");
    expect(JSON.stringify(result)).not.toContain("carbon_emissions");
    expect(result.length).toBeLessThanOrEqual(3);
  });

  test("The tool should return refs to correct booking tokens.", async () => {
    const refs = new Map<string, BookingHandle>();
    await getFlights.invoke(
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
    expect(refs.has("flt_0")).toBe(true);
    expect(refs.get("flt_0")).toEqual({
      kind: "booking",
      token: SAMPLE_FLIGHT_DATA.data.itineraries.topFlights[0].booking_token,
    });
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

describe("get_hotels tool", () => {
  test("The tool should return filtered data", async () => {
    const refs = new Map<string, BookingHandle>();
    const result = await getHotels.invoke(
      new RunContext({ refs: refs }),
      JSON.stringify({
        lat: 39.9,
        lon: 116.4,
        person: 1,
        checkInDate: "2026-08-30",
        checkOutDate: "2026-09-18",
        currencyCode: null,
      }),
    );
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result[0]).toEqual({
      name: "Cordis, Beijing Capital Airport By Langham Hospitality Group",
      translatedName: "Cordis, Beijing Capital Airport By Langham Hospitality Group",
      checkInTime: { until: "23:30", from: "14:00" },
      checkOutTime: { from: "01:00", until: "12:00" },
      reviewScore: 8.7,
      reviewCount: 1830,
      star: 5,
      price: { value: 3352.39818467217, currency: "USD" },
      ref: "htl_0",
    });
    expect(JSON.stringify(result)).not.toContain("hotel_include_breakfast");
    expect(JSON.stringify(result)).not.toContain("main_photo_url");
  });
  testUpstreamFailures({
    tool: getHotels,
    endpoint: "https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotelsByCoordinates",
    args: {
      lat: 39.9,
      lon: 116.4,
      person: 1,
      checkInDate: "2026-08-30",
      checkOutDate: "2026-09-18",
      currencyCode: null,
    },
    messages: {
      credentials: TOOL_ERRORS.get_hotels.credentials,
      retryable: TOOL_ERRORS.get_hotels.retryable,
      generic: TOOL_ERRORS.get_hotels.generic,
    },
  });
});

describe("get_attractions tool", () => {
  test("The tool should return filtered data", async () => {
    const result = await getAttractions.invoke(
      new RunContext(),
      JSON.stringify({
        lat: 51.5,
        lon: 0.1,
      }),
    );
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result[5]).toEqual({
      name: "Sherlock Holmes Museum",
      website: "https://www.sherlock-holmes.co.uk/",
      openingHours: "Mo-Su 09:30-18:00",
      categories: ["entertainment", "entertainment.museum", "fee"],
      wikipedia: "en:Sherlock Holmes Museum",
    });
    expect(JSON.stringify(result[5])).not.toContain("福爾摩斯博物館");
    expect(JSON.stringify(result)).not.toContain(
      "146 Hamilton Terrace, London, NW8 9UX, United Kingdom",
    );
  });
  testUpstreamFailures({
    tool: getAttractions,
    endpoint: "https://api.geoapify.com/v2/places",
    args: {
      lat: 39.9,
      lon: 116.4,
    },
    messages: {
      credentials: TOOL_ERRORS.get_attractions.credentials,
      retryable: TOOL_ERRORS.get_attractions.retryable,
      generic: TOOL_ERRORS.get_attractions.generic,
    },
  });
});

describe("get_next_flights tool", () => {
  test("The tool returns filtered data", async () => {
    const refs = new Map<string, BookingHandle>();
    refs.set("flt_3", { kind: "next", token: "test_flight_token" });
    const result = await getNextFlight.invoke(
      new RunContext({ refs }),
      JSON.stringify({
        ref: "flt_3",
        currency: null,
      }),
    );
    expect(result.length).toBeLessThanOrEqual(3);
    expect(JSON.stringify(result)).toContain('"departureTime":"19-11-2026 05:30 PM"');
    expect(JSON.stringify(result)).toContain('"arrivalTime":"19-11-2026 08:31 PM"');
    expect(JSON.stringify(result)).not.toContain("Emissions estimate");
    expect(JSON.stringify(result)).not.toContain("booking_token");
  });

  test("The tool populates refs with booking handles for the return flight.", async () => {
    const refs = new Map<string, BookingHandle>();
    refs.set("flt_0", { kind: "next", token: "test_flight_token" });
    await getNextFlight.invoke(
      new RunContext({ refs }),
      JSON.stringify({
        ref: "flt_0",
        currency: null,
      }),
    );
    expect(refs.size).toBe(4);
    expect(refs.get("flt_1")).toEqual({
      kind: "booking",
      token: SAMPLE_BOOK_TOKEN_FLIGHT.data.itineraries.topFlights[0].booking_token,
    });
  });

  test("The tool fails for incorrect kind of booking handle", async () => {
    const refs = new Map<string, BookingHandle>();
    refs.set("flt_0", { kind: "booking", token: "test_flight_token" });
    const result = await getNextFlight.invoke(
      new RunContext({ refs }),
      JSON.stringify({
        ref: "flt_0",
        currency: null,
      }),
    );
    expect(result).toBe(
      `flt_0 is not a outbound flight. Please use an entry from the result of get_flights tool.`,
    );
    const resultFromNullRef = await getNextFlight.invoke(
      new RunContext({ refs }),
      JSON.stringify({
        ref: "flt_1",
        currency: null,
      }),
    );
    expect(resultFromNullRef).toBe(`Unknown ref flt_1. Please select a different flight. `);
  });

  test("The tool correctly obtains the token from context", async () => {
    const refs = new Map<string, BookingHandle>();
    refs.set("flt_0", { kind: "next", token: "test_flight_token" });
    const spy = vi.spyOn(globalThis, "fetch");
    await getNextFlight.invoke(
      new RunContext({ refs }),
      JSON.stringify({
        ref: "flt_0",
        currency: null,
      }),
    );

    const [url] = spy.mock.calls[0] as [URL];
    expect(url).toBeInstanceOf(URL);
    expect(url.searchParams.get("next_token")).toBe("test_flight_token");
  });

  testUpstreamFailures({
    tool: getNextFlight,
    endpoint: "https://google-flights2.p.rapidapi.com/api/v1/getNextFlights",
    args: {
      ref: "flt_1",
      currency: null,
    },
    messages: {
      credentials: TOOL_ERRORS.get_next_flights.credentials,
      retryable: TOOL_ERRORS.get_next_flights.retryable,
      generic: TOOL_ERRORS.get_next_flights.generic,
    },
    refs: new Map([["flt_1", { kind: "next", token: "test_next_token" }]]),
  });
});
