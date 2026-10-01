import "server-only";

import {
  Agent,
  Model,
  setDefaultOpenAIClient,
  setOpenAIAPI,
  setTracingDisabled,
} from "@openai/agents";
import OpenAI from "openai";
import {
  getAttractions,
  getFlights,
  getHotels,
  getLatLon,
  getNextFlight,
  getWeather,
  searchAirport,
} from "./tools";
import { ModelOutputSchema } from "../type";
import {
  AI_KEY,
  AI_MODEL,
  AI_URL,
  FORMATTER_MODEL,
  plannerProviderData,
  formatterProviderData,
} from "./config";

const client = new OpenAI({
  baseURL: AI_URL,
  apiKey: AI_KEY,
});

setDefaultOpenAIClient(client);
setOpenAIAPI("chat_completions");
setTracingDisabled(true);

export function createPlannerAgent(model: string | Model | undefined) {
  return new Agent({
    name: "Travel Agent",
    instructions: `You are a helpful travel planner. You will plan the user's trip in plain text format. Your response text will be processed by another agent into properly formatted data. You response will include "events", which include weather, transportation, accommodations, and tourist activities. Separate them out into text blocks.

    You have variety of tools to choice from. You should use these tools to find the latest information when applicable. You will not be able to ask for a follow up from the user. You can make assumptions that feels fair, such as choosing flying as the mode of transportation for a trip from London to Beijing. For transportation and accommodations, you will pick one for the user instead of providing them with options.

    In addition to information about each event, you will also include some meta data to help the other agent. These will be available in the tool result. For the chosen flight, only mention the return ref obtained from the get_next_flights tool. It will be shaped like "flt_{number}". Similarly, for the chosen hotel, mention the ref, "htl_{number}". For each attraction, verbatim the wikipedia field of the tool output.

    `,

    model: model,
    tools: [
      getLatLon,
      getWeather,
      getFlights,
      searchAirport,
      getHotels,
      getAttractions,
      getNextFlight,
    ],
    modelSettings: {
      providerData: plannerProviderData,
    },
    // outputType: ModelOutputSchema,
  });
}

export function createFormatterAgent(model: string | Model | undefined) {
  return new Agent({
    name: "Formatter Agent",
    // instructions: `You are a formatter agent. You will convert the plain text itinerary into the required JSON format. Copy these values verbatim: the flight ref (flt_N), the hotel ref (htl_N), and the wikipedia value. For the flight, use only the return flight's ref, never the outbound one. If an item has no ref or wikipedia value in the itinerary, set its action to null. The itinerary will contain events such as weather, transportation, accommodation, things to do, etc. Produce one event per item in the itinerary: one for transportation, one for the hotel, one for weather if mentioned, and one for each attraction. A typical trip yields 5-8 events. Never return an empty events array — if the text describes N items, emit N events. The description field will be user facing. Keep the language concise, natural and easy to read.`,

    instructions: `You are a formatter agent. Convert the plain-text itinerary into the required JSON format.

    Emit these events first, in this order:
    1. Weather, if mentioned. Action: null.
    2. Flight: exactly ONE event for the round trip, even if the itinerary lists the outbound and return flights separately. Action: book_flight with the return flight's ref (the one labelled "Return ref", or the ref on the return flight). Never use the outbound ref.
    3. Hotel. Action: book_hotel with its htl_N ref.

    Then emit one event per named attraction, in itinerary order. Action: view_attraction with the wikipedia value copied verbatim. If an attraction has no wikipedia value, set its action to null. Do not create events for rest days, free days, travel logistics or general advice. Never emit the same item twice.

    Copy refs and wikipedia values exactly as written and never invent one. If the flight or hotel has no ref in the itinerary, still emit its event with action null.

    The description field is user facing: one concise, natural sentence.`,

    model: model,
    modelSettings: {
      providerData: formatterProviderData,
    },
    outputType: ModelOutputSchema,
  });
}

export const plannerAgent = createPlannerAgent(AI_MODEL);
export const formatterAgent = createFormatterAgent(FORMATTER_MODEL);

plannerAgent.on("agent_start", (ctx, agent) => console.log("▶ agent started: ", agent.name));
plannerAgent.on("agent_tool_start", (ctx, tool, details) =>
  console.log("🔧 Tool started: ", tool.name, details?.toolCall),
);
plannerAgent.on("agent_tool_end", (ctx, tool, result) =>
  console.log("✅ Tool finished: ", tool.name, result),
);
plannerAgent.on("agent_end", (ctx, output) => console.log("⏹", output));

formatterAgent.on("agent_start", (ctx, agent) => console.log("▶ agent started: ", agent.name));
formatterAgent.on("agent_end", (ctx, output) => console.log("⏹", output));
