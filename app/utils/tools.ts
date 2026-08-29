import { tool } from "@openai/agents";
import z from "zod";
import { GEOAPIFY_KEY, WEATHER_API_KEY } from "./config";
import { fetchAPI, fetchRapidAPI } from "./fetching";
import { constructUrl, parseData } from "./utils";
import {
  AirportSchema,
  FetchError,
  FlightSchema,
  HotelsSchema,
  LatLonSchema,
  PlacesSchema,
  TravelAgentContext,
  WeatherSchema,
} from "../type";
import { TOOL_ERRORS, toolErrorHandler } from "./toolErrors";

export const getLatLon = tool({
  name: "get_lat_lon",
  description: "Return the latitude and longitude of a city",
  parameters: z.object({
    city: z.string().describe("The name of the city to search for. "),
    countryCode: z.string().nullable().describe("ISO country code. e.g. GB"),
  }),
  // errorFunction(_, error) {
  //   const toolName = "get_lat_lon";
  //   if (error instanceof FetchError) {
  //     console.error(toolName, error.status, error.message, error.url);
  //     if (error.status === 401 || error.status === 402) {
  //       return "Our end point credentials are invalid or have expired. Skip and continue planing with your own knowledge.";
  //     }
  //     if (error.retryable) {
  //       return "The end point is temporarily unavailable. Try again or continue planing with your own knowledge.";
  //     }
  //   }
  //   console.error(toolName, error);
  //   return `LatLon look up failed. Please try a different name for the city or continue planing with your knowledge.`;
  // },
  errorFunction(_, error) {
    const toolName = "get_lat_lon" as const;
    const handler = toolErrorHandler(toolName, TOOL_ERRORS[toolName]);
    return handler(_, error);
  },
  async execute({ city, countryCode }) {
    const query = countryCode ? city + "," + countryCode : city;
    const baseURL = "https://api.openweathermap.org/geo/1.0/direct";
    const fullURL = constructUrl(baseURL, { q: query, appid: WEATHER_API_KEY });
    const latLonData = await fetchAPI(fullURL);
    const parseResult = parseData(LatLonSchema, latLonData);
    return parseResult;
  },
});

export const getWeather = tool({
  name: "get_weather",
  description: "Return the weather for a given location.",
  parameters: z.object({
    lat: z.number().describe("The latitude of the city"),
    lon: z.number().describe("The longitude of the city"),
    unit: z
      .string()
      .nullable()
      .describe(
        "Unit of measurement. 'metric' and 'imperial' units are available. Defaults to 'metric'.",
      ),
  }),
  // errorFunction(_, error) {
  //   const toolName = "[get_weather]";
  //   if (error instanceof FetchError) {
  //     console.error(toolName, error.status, error.message, error.url);
  //     if (error.status === 401 || error.status === 402) {
  //       return "Our weather end point credentials are invalid or have expired. Skip weather and continue planing.";
  //     }
  //     if (error.retryable) {
  //       return "The weather end point is temporarily unavailable. Try again or continue planing without weather.";
  //     }
  //   }
  //   console.error(toolName, error);
  //   return `Weather look up failed. Try again or continue without weather information. `;
  // },
  errorFunction(_, error) {
    const toolName = "get_weather" as const;
    const handler = toolErrorHandler(toolName, TOOL_ERRORS[toolName]);
    return handler(_, error);
  },
  async execute({ lat, lon, unit }) {
    const unitCleaned = unit == "imperial" ? "imperial" : "metric";
    const baseURL = "https://api.openweathermap.org/data/2.5/weather";
    const options = {
      lat,
      lon,
      appid: WEATHER_API_KEY,
      units: unitCleaned,
    };
    const fullUrl = constructUrl(baseURL, options);
    const data = await fetchAPI(fullUrl);
    const parsedData = parseData(WeatherSchema, data);
    const filteredResult = {
      weather: parsedData.weather[0].main,
      weatherDescription: parsedData.weather[0].description,
      temp: parsedData.main.temp,
    };
    return filteredResult;
  },
});

export const searchAirport = tool({
  name: "search_airport",
  description: "Return information including the IATA code of airports.",
  parameters: z.object({
    query: z
      .string()
      .describe("The search term to find an airport, which can be a place name, city, or state."),
  }),
  // errorFunction(_, error) {
  //   const toolName = "[search_airport]";
  //   if (error instanceof FetchError) {
  //     console.error(toolName, error.status, error.message, error.url);
  //     if (error.status === 401 || error.status === 402) {
  //       return "Our Google Flights credentials are invalid or have expired. Continue with your own knowledge.";
  //     }
  //     if (error.retryable) {
  //       return "The Google Flights end point is temporarily unavailable. Try again or continue with your own knowledge.";
  //     }
  //   }
  //   console.error(toolName, error);
  //   return `Airport lookup failed. Continue with your own knowledge.`;
  // },
  errorFunction(_, error) {
    const toolName = "search_airport" as const;
    const handler = toolErrorHandler(toolName, TOOL_ERRORS[toolName]);
    return handler(_, error);
  },
  async execute({ query }) {
    const baseURL = "https://google-flights2.p.rapidapi.com/api/v1/searchAirport";
    const options = {
      query,
    };
    const url = constructUrl(baseURL, options);

    // if (query == "Vancouver") {
    //   return "YVR";
    // } else {
    //   return "PEK";
    // }

    const response = await fetchRapidAPI(url, "google-flights2.p.rapidapi.com");
    const parsedData = parseData(AirportSchema, response);
    return parsedData;
  },
});

const getFlightsParams = z.object({
  departure: z.string().describe("Departure Airport's IATA code. Example: LAX"),
  arrival: z.string().describe("The IATA code of the arrival airport. Example: JFK"),
  departureDate: z.iso
    .date()
    .describe("The date of departure for the trip. /Use ISO date string, such as 2026-09-20"),
  returningDate: z.iso
    .date()
    .describe("The date of return for round-trip flights. Use ISO date string, such as 2026-09-27"),
  personCount: z.number().describe("The number of passengers."),
  currency: z
    .string()
    .nullable()
    .describe("Sets the currency for price formatting in the response. Eg. USD, CAD"),
});

export const getFlights = tool<typeof getFlightsParams, TravelAgentContext>({
  name: "get_flights",
  description: "Return the flights form a city to another city on the given date.",
  parameters: getFlightsParams,
  errorFunction(_, error) {
    const toolName = "get_flights" as const;
    const handler = toolErrorHandler(toolName, TOOL_ERRORS[toolName]);
    return handler(_, error);
  },
  async execute(
    { departure, arrival, departureDate, returningDate, personCount, currency },
    context,
  ) {
    const baseURL = "https://google-flights2.p.rapidapi.com/api/v1/searchFlights";
    const options = {
      departure_id: departure,
      arrival_id: arrival,
      outbound_date: departureDate,
      return_date: returningDate,
      adults: personCount,
      currency: currency ?? "USD",
    };
    const url = constructUrl(baseURL, options);
    const response = await fetchRapidAPI(url, "google-flights2.p.rapidapi.com");

    // const response = SAMPLE_FLIGHT_DATA;
    const parsedData = parseData(FlightSchema, response);

    const filteredResult = parsedData.data.itineraries.topFlights.map((flight, index) => {
      const flightRef = `flt_${context?.context.refs.size ?? index}`;
      if (flight.next_token) {
        context?.context.refs.set(flightRef, { kind: "next", token: flight.next_token });
      } else if (flight.booking_token) {
        context?.context.refs.set(flightRef, {
          kind: "booking",
          token: flight.booking_token,
        });
      }
      return {
        departureTime: flight.departure_time,
        arrivalTime: flight.arrival_time,
        duration: flight.duration,
        price: flight.price,
        segments: flight.flights.map((leg) => ({
          departure: leg.departure_airport,
          arrival: leg.arrival_airport,
          duration: leg.duration,
        })),
        layovers: flight.layovers,
        ref: flightRef,
      };
    });
    return filteredResult.slice(0, 3);
  },
});

// The old type definition for flight. Keeping for reference.
//   : {
//   departure_time: string;
//   arrival_time: string;
//   duration: {
//     raw: number;
//     text: string;
//   };
//   price: number;
//   flights: [{ departure_airport: any; arrival_airport: any; duration: number }];
//   layovers: {}[];
// }

export const getHotels = tool({
  name: "get_hotels",
  description:
    "Return a list of available accommodations for a given location. The rate is per night.",
  parameters: z.object({
    lat: z.number().describe("The latitude of the city"),
    lon: z.number().describe("The longitude of the city"),
    person: z.number().describe("Number of person staying."),
    checkInDate: z.iso.date().describe("The date to check in on. "),
    checkOutDate: z.iso.date().describe("The date to check out on. "),
    currencyCode: z
      .string()
      .nullable()
      .describe(
        "The currency to display the price in, in ISO format. e.g. USD, CAD, JPY. Defaults to USD",
      ),
  }),
  errorFunction(_, error) {
    const toolName = "get_hotels" as const;
    const handler = toolErrorHandler(toolName, TOOL_ERRORS[toolName]);
    return handler(_, error);
  },
  async execute({ lat, lon, person, checkInDate, checkOutDate, currencyCode }) {
    const baseURL = "https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotelsByCoordinates";
    const options = {
      latitude: lat,
      longitude: lon,
      arrival_date: checkInDate,
      departure_date: checkOutDate,
      adults: person,
      currency_code: currencyCode ?? "USD",
    };
    const url = constructUrl(baseURL, options);
    const host = "booking-com15.p.rapidapi.com";

    const result = await fetchRapidAPI(url, host);
    // const result = SAMPLE_HOTEL_DATA;
    const parsedData = parseData(HotelsSchema, result);
    const filteredResult = parsedData.data.result.map((hotel) => ({
      name: hotel.hotel_name, //"Cordis, Beijing Capital Airport By Langham Hospitality Group"
      translatedName: hotel.hotel_name_trans, //"Cordis, Beijing Capital Airport By Langham Hospitality Group"
      checkInTime: hotel.checkin, //          until: "23:30",from: "14:00",
      checkOutTime: hotel.checkout, //          {from: "01:00",          until: "12:00",}
      reviewScore: hotel.review_score, //8.7
      reviewCount: hotel.review_nr, //1830
      star: hotel.class, //5
      price: hotel.composite_price_breakdown.all_inclusive_amount, //{value: 3352.39818467217, currency: "USD"}
      hotelId: hotel.hotel_id, //247527
    }));
    return filteredResult.slice(0, 5);
  },
});

//  Old hotel definition.
// : {
//         name: string;
//         review_score: number;
//         review_nr: number;
//         checkout: {
//           from: string;
//           until: string;
//         };
//         checkin: {
//           from: string;
//           until: string;
//         };
//         hotel_name_trans?: string;
//         all_inclusive_amount: {
//           currency: string;
//           value: number;
//         };
//         class: number;
//       }

export const getAttractions = tool({
  name: "get_attractions",
  description: "Return a list of tourist attractions for a given location. ",
  parameters: z.object({
    lat: z.number().describe("The latitude of the city"),
    lon: z.number().describe("The longitude of the city"),
  }),
  errorFunction(_, error) {
    const toolName = "get_attractions" as const;
    const handler = toolErrorHandler(toolName, TOOL_ERRORS[toolName]);
    return handler(_, error);
  },
  async execute({ lat, lon }) {
    const baseURL = "https://api.geoapify.com/v2/places";
    const options = {
      categories: `heritage,national_park,tourism.sights,entertainment.museum,entertainment.zoo,entertainment.aquarium`,
      filter: `circle:${lon},${lat},10000`,
      conditions: "named",
      limit: 10,
      apiKey: GEOAPIFY_KEY,
    };
    const url = constructUrl(baseURL, options);
    const result = await fetchAPI(url);
    const parsedData = parseData(PlacesSchema, result);
    const filteredResult = parsedData.features.map((place) => ({
      name: place.properties.name_international?.en || place.properties.name,
      website: place.properties.website,
      openingHours: place.properties.opening_hours,
      categories: place.properties.categories,
      wikipedia: place.properties.wiki_and_media?.wikipedia,
    }));
    return filteredResult.slice(0, 10);
  },
});

// Old type definition for place.
// : {
//         properties: {
//           name: string;
//           name_international?: { en?: string };
//           website?: string;
//           opening_hours?: string;
//           categories: string[];
//           descriptions?: string;
//         };
//       }

// export const getWeather = tool({
//   name: "get_weather",
//   description: "Return the weather for a given city.",
//   parameters: z.object({ city: z.string() }),
//   async execute({ city }) {
//     return `The weather in ${city} is sunny.`;
//   },
// });

/*
[
      {
        city: "Beijing",
        name: "Sofitel Beijing Central",
        price: 123,
        unit: "CAD",
        amenities: ["Free Wi-Fi", "Breakfast"],
        star: "",
        checkInTime: "3:00 p.m.",
        checkOutTime: "12:00 p.m.",
      },
      {
        city: "Beijing",
        name: "Stey-Wangfujing",
        price: 106,
        unit: "CAD",
        amenities: ["Free Wi-Fi", "Breakfast", "Air conditioning"],
        star: "5-star",
        checkInTime: "3:00 p.m.",
        checkOutTime: "12:00 p.m.",
      },
      {
        city: "Beijing",
        name: "Live Fortuna Hotel",
        price: 80,
        unit: "CAD",
        amenities: ["Free Wi-Fi", "Breakfast"],
        star: "4-star",
        checkInTime: "2:00 p.m.",
        checkOutTime: "12:00 p.m.",
      },
    ];
*/
