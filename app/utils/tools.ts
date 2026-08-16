import { tool } from "@openai/agents";
import z from "zod";

export const getWeather = tool({
  name: "get_weather",
  description: "Return the weather for a given city.",
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    return `The weather in ${city} is sunny.`;
  },
});

export const getFlights = tool({
  name: "get_flights",
  description: "Return the flights form a city to another city on the given date.",
  parameters: z.object({
    from: z.string().describe("Departure city."),
    to: z.string().describe("Destination city"),
    departureDate: z.date().describe("Use ISO date string, such as 2026-09-20"),
    returningDate: z.date().describe("Use ISO date string, such as 2026-09-27"),
  }),
  async execute({ from, to, departureDate }) {
    return `FN: Flight AC199. ${departureDate}T09:00:00. Economy: $1992.18. Availability: 20`;
  },
});

export const getHotels = tool({
  name: "get_hotels",
  description: "Return a list of available accommodations for a given city. The rate is per night.",
  parameters: z.object({
    city: z.string(),
    adult: z.number().describe("Number of adults staying."),
    children: z.number().describe("Number of children staying."),
    checkInDate: z.iso.date().describe("The date to check in on. "),
    checkOutDate: z.iso.date().describe("The date to check out on. "),
    unit: z
      .string()
      .nullable()
      .describe(
        "The currency to display the price in, in ISO format. e.g. USD, CAD, JPY. Defaults to USD",
      ),
  }),
  async execute({ city }) {
    return [
      {
        city,
        name: "Sofitel Beijing Central",
        price: 123,
        unit: "CAD",
        amenities: ["Free Wi-Fi", "Breakfast"],
        star: "",
        checkInTime: "3:00 p.m.",
        checkOutTime: "12:00 p.m.",
      },
      {
        city,
        name: "Stey-Wangfujing",
        price: 106,
        unit: "CAD",
        amenities: ["Free Wi-Fi", "Breakfast", "Air conditioning"],
        star: "5-star",
        checkInTime: "3:00 p.m.",
        checkOutTime: "12:00 p.m.",
      },
      {
        city,
        name: "Live Fortuna Hotel",
        price: 80,
        unit: "CAD",
        amenities: ["Free Wi-Fi", "Breakfast"],
        star: "4-star",
        checkInTime: "2:00 p.m.",
        checkOutTime: "12:00 p.m.",
      },
    ];
  },
});

// export const getWeather = tool({
//   name: "get_weather",
//   description: "Return the weather for a given city.",
//   parameters: z.object({ city: z.string() }),
//   async execute({ city }) {
//     return `The weather in ${city} is sunny.`;
//   },
// });
