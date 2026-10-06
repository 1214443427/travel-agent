import { RunContext, tool } from "@openai/agents";
import z from "zod";
import { GEOAPIFY_KEY, WEATHER_API_KEY } from "./config";
import { fetchAPI, fetchRapidAPI } from "./fetching";
import { addRef, constructUrl, parseData } from "./utils";
import {
  AirportSchema,
  BookingHandle,
  FlightSchema,
  HotelHandle,
  HotelsSchema,
  LatLonSchema,
  PlacesSchema,
  TravelAgentContext,
  WeatherSchema,
} from "../type";
import {
  getFlightsEmptyError,
  getNextFlightsEmptyError,
  TOOL_ERRORS,
  toolErrorHandler,
} from "./toolErrors";
import {
  SAMPLE_BOOK_TOKEN_FLIGHT,
  SAMPLE_NEXT_TOKEN_FLIGHT,
} from "@/__tests__/testData/sampleFlightDataWithNextToken";
import { SAMPLE_HOTEL_DATA } from "@/__tests__/testData/sampleHotelData";
import { SAMPLE_FLIGHT_DATA } from "@/__tests__/testData/sampleFlightData";

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

function filterFlights(
  parsedData: z.infer<typeof FlightSchema>,
  numberOfFlights: number,
  context?: RunContext<TravelAgentContext>,
) {
  const itineraries = parsedData.data.itineraries;
  const flights = itineraries.topFlights?.length
    ? itineraries.topFlights
    : itineraries.otherFlights?.length
      ? itineraries.otherFlights
      : [];
  const filteredResult = flights.slice(0, numberOfFlights).map((flight) => {
    const handle = flight.next_token
      ? { kind: "next" as const, token: flight.next_token }
      : flight.booking_token
        ? {
            kind: "booking" as const,
            token: flight.booking_token,
          }
        : null;
    const flightRef = addRef(context, "flt", handle);
    return {
      departureTime: flight.departure_time,
      arrivalTime: flight.arrival_time,
      duration: flight.duration,
      roundTripPrice: flight.price,
      segments: flight.flights.map((leg) => ({
        departure: leg.departure_airport,
        arrival: leg.arrival_airport,
        duration: leg.duration,
      })),
      layovers: flight.layovers,
      ref: flightRef,
    };
  });
  return filteredResult;
}

export const getFlights = tool<typeof getFlightsParams, TravelAgentContext>({
  name: "get_flights",
  description:
    "Return the outbound flight form a city to another city on the given date. The returned data will include a ref like 'flt_0'. Call get_next_flights to obtain the returning flight. Note that the price is the estimated amount for a full round trip.",
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
    // const response = SAMPLE_NEXT_TOKEN_FLIGHT;
    // const response = SAMPLE_FLIGHT_DATA;

    const parsedData = parseData(FlightSchema, response);
    const filteredFlights = filterFlights(parsedData, 3, context);

    if (filteredFlights.length === 0) {
      return getFlightsEmptyError(departure, arrival);
    }

    return filteredFlights;
  },
});

const getNextFlightParams = z.object({
  ref: z.string().describe("The ref of a outbound flight obtained from the get_flights call."),
  currency: z
    .string()
    .nullable()
    .describe(
      "Sets the currency for price formatting in the response. Allows ISO code. Defaults to USD",
    ),
});

export const getNextFlight = tool<typeof getNextFlightParams, TravelAgentContext>({
  name: "get_next_flights",
  description:
    "Returns the returning set of a flight based on the outbound flight from a previous search. Used to retrieve returning flight of a round-trip flight. Note that the price is the accurate amount for the full round trip.",
  parameters: getNextFlightParams,
  errorFunction(_, error) {
    const toolName = "get_next_flights" as const;
    const handler = toolErrorHandler(toolName, TOOL_ERRORS[toolName]);
    return handler(_, error);
  },
  async execute({ ref, currency }, context) {
    const handle = context?.context.refs.get(ref);
    if (!handle) {
      return `Unknown ref ${ref}. Please select a different flight. `;
    }
    if (handle.kind != "next") {
      return `${ref} is not a outbound flight. Please use an entry from the result of get_flights tool.`;
    }
    const baseURL = "https://google-flights2.p.rapidapi.com/api/v1/getNextFlights";
    const options = {
      next_token: handle.token,
      currency: currency ?? "USD",
    };

    const url = constructUrl(baseURL, options);

    const response = await fetchRapidAPI(url, "google-flights2.p.rapidapi.com", 60_000);
    // const response = SAMPLE_BOOK_TOKEN_FLIGHT;

    const parsedData = parseData(FlightSchema, response);

    const filteredFlights = filterFlights(parsedData, 3, context);

    if (filteredFlights.length === 0) {
      return getNextFlightsEmptyError(ref);
    }

    return filteredFlights;
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
const getHotelsParams = z.object({
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
});

export const getHotels = tool<typeof getHotelsParams, TravelAgentContext>({
  name: "get_hotels",
  description:
    "Return up to 5 accommodations near a location. price is the all-inclusive total for the whole stay, not per night. Each result includes a ref like 'htl_3'; mention the chosen hotel's ref in your plan.",
  parameters: getHotelsParams,
  errorFunction(_, error) {
    const toolName = "get_hotels" as const;
    const handler = toolErrorHandler(toolName, TOOL_ERRORS[toolName]);
    return handler(_, error);
  },
  async execute({ lat, lon, person, checkInDate, checkOutDate, currencyCode }, context) {
    const baseURL = "https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotelsByCoordinates";
    const options = {
      latitude: lat,
      longitude: lon,
      arrival_date: checkInDate,
      departure_date: checkOutDate,
      adults: person,
      currency_code: currencyCode ?? "USD",
      radius: 20,
    };
    const url = constructUrl(baseURL, options);
    const host = "booking-com15.p.rapidapi.com";

    const result = await fetchRapidAPI(url, host);
    // const result = SAMPLE_HOTEL_DATA;
    const parsedData = parseData(HotelsSchema, result);
    const filteredResult = parsedData.data.result.slice(0, 5).map((hotel) => {
      const handle: HotelHandle = {
        kind: "hotel",
        token: String(hotel.hotel_id),
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: person,
      };
      const ref = addRef(context, "htl", handle);
      return {
        name: hotel.hotel_name, //"Cordis, Beijing Capital Airport By Langham Hospitality Group"
        translatedName: hotel.hotel_name_trans, //"Cordis, Beijing Capital Airport By Langham Hospitality Group"
        checkInTime: hotel.checkin, //          until: "23:30",from: "14:00",
        checkOutTime: hotel.checkout, //          {from: "01:00",          until: "12:00",}
        reviewScore: hotel.review_score, //8.7
        reviewCount: hotel.review_nr, //1830
        star: hotel.class, //5
        price: hotel.composite_price_breakdown.all_inclusive_amount, //{value: 3352.39818467217, currency: "USD"}
        ref: ref,
      };
    });
    return filteredResult;
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
