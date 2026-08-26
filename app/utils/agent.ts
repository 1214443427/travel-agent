import "server-only";

import { Agent, setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } from "@openai/agents";
import OpenAI from "openai";
import {
  getAttractions,
  getFlights,
  getHotels,
  getLatLon,
  getWeather,
  searchAirport,
} from "./tools";
import { ModelOutputSchema, TravelAgentContext } from "../type";
import { AI_KEY, AI_MODEL, AI_URL, FORMATTER_MODEL } from "./config";

const client = new OpenAI({
  baseURL: AI_URL,
  apiKey: AI_KEY,
});

setDefaultOpenAIClient(client);
setOpenAIAPI("chat_completions");
setTracingDisabled(true);

export const agent = new Agent({
  name: "Travel Agent",
  instructions: `You are a helpful travel planner. You will plan the user's trip in plain text format. Your response text will be processed by another agent into properly formatted data. You response will include "events", which include weather, transportation, accommodations, and tourist activities. Separate them out into text blocks.
  
  You have variety of tools to choice from. You should use these tools to find the latest information when applicable. You will not be able to ask for a follow up from the user. You can make assumptions that feels fair, such as choosing flying as the mode of transportation for a trip from London to Beijing. For transportation and accommodations, you will pick one for the user instead of providing them with options. 
    
  In addition to information about each event, you will also include some meta data to help the other agent. These will be available in the tool result. For the chosen flight, mention the ref returned in the tool. It will be shaped like "flt_{number}". Similarly, for the chosen hotel, mention the "hotelId". For each attraction, verbatim the wikipedia field of the tool output.
    
  `,
  model: AI_MODEL,
  tools: [
    getLatLon,
    getWeather,
    getFlights,
    // searchAirport,
    getHotels,
    getAttractions,
  ],
  modelSettings: {
    providerData: { provider: { require_parameters: true, allow_fallbacks: false } },
  },
  // outputType: ModelOutputSchema,
});

export const formatterAgent = new Agent({
  name: "Formatter Agent",
  instructions: `You are a formatter agent. You will convert the plain text itinerary into the required JSON format. Copy every ref, hotelId and wikipedia value verbatim. The itinerary will contain events such as weather, transportation, accommodation, things to do, etc. Produce one event per item in the itinerary: one for transportation, one for the hotel, one for weather if mentioned, and one for each attraction. A typical trip yields 5-8 events. Never return an empty events array — if the text describes N items, emit N events.`,
  model: FORMATTER_MODEL,
  modelSettings: {
    providerData: {
      provider: {
        require_parameters: true,
        // maxTokens: 3000
      },
    },
  },
  outputType: ModelOutputSchema,
});

agent.on("agent_start", (ctx, agent) => console.log("▶ agent started: ", agent.name));
agent.on("agent_tool_start", (ctx, tool, details) =>
  console.log("🔧 Tool started: ", tool.name, details?.toolCall),
);
agent.on("agent_tool_end", (ctx, tool, result) =>
  console.log("✅ Tool finished: ", tool.name, result),
);
agent.on("agent_end", (ctx, output) => console.log("⏹", output));

formatterAgent.on("agent_start", (ctx, agent) => console.log("▶ agent started: ", agent.name));
formatterAgent.on("agent_end", (ctx, output) => console.log("⏹", output));
