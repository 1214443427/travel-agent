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
import { ResponseSchema } from "../type";
import { AI_KEY, AI_MODEL, AI_URL } from "./config";

const client = new OpenAI({
  baseURL: AI_URL,
  apiKey: AI_KEY,
});

setDefaultOpenAIClient(client);
setOpenAIAPI("chat_completions");
setTracingDisabled(true);

export const agent = new Agent({
  name: "Travel Agent",
  instructions:
    "You are a helpful travel planner. You will plan the user's trip for them, such as mode of transportation, accommodations, or activities. You have variety of tools to choice from. You should prioritize using tools to find the latest information rather than relaying on your training data. You will not be able to ask for a follow up from the user. You can make assumptions that feels fair, such as choosing flying as the mode of transportation for a trip from London to Beijing.",
  model: AI_MODEL,
  tools: [getLatLon, getWeather, getFlights, searchAirport, getHotels, getAttractions],
  modelSettings: { providerData: { provider: { require_parameters: true } } },
  // outputType: ResponseSchema,
  // Schema not behaving as expected. Add few shot maybe?
});

agent.on("agent_start", (ctx, agent) => console.log("▶ agent started: ", agent.name));
agent.on("agent_tool_start", (ctx, tool, details) =>
  console.log("🔧 Tool started: ", tool.name, details?.toolCall),
);
agent.on("agent_tool_end", (ctx, tool, result) =>
  console.log("✅ Tool finished: ", tool.name, result),
);
agent.on("agent_end", (ctx, output) => console.log("⏹", output));
