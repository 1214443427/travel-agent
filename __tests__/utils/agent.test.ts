//@vitest-environment node
import { AgentInputItem, MaxTurnsExceededError, ModelBehaviorError, Runner } from "@openai/agents";
import { ScriptedModel, assistantMessage, functionCall } from "@openai/agents/testing";

import { describe, expect, test } from "vitest";
import { createFormatterAgent, createPlannerAgent } from "@/app/utils/agent";
import { BookingHandle, TravelAgentContext } from "@/app/type";
import { TEXT_SAMPLE } from "../testData/sampleTextData";
import { SAMPLE_FORMATTER_OUTPUT } from "../testData/sampleResponseData";

describe("Planner agent", () => {
  test("runs a multi-turn tool workflow", async () => {
    const model = new ScriptedModel([
      // The first model turn enters the real SDK tool execution pipeline.
      [
        functionCall(
          "get_lat_lon",
          { city: "New York", countryCode: null },
          { callId: "call_lat_lon_nyc" },
        ),
      ],
      [
        functionCall(
          "get_lat_lon",
          { city: "Beijing", countryCode: null },
          { callId: "call_lat_lon_beijing" },
        ),
      ],
      [
        functionCall(
          "get_weather",
          { lat: 40.7127281, lon: -74.0060152, unit: "metric" },
          { callId: "call_weather_nyc" },
        ),
      ],
      [
        functionCall(
          "get_weather",
          { lat: 39.9, lon: 116.4, unit: "metric" },
          { callId: "call_weather_beijing" },
        ),
      ],
      [functionCall("search_airport", { query: "New York" }, { callId: "call_airport_nyc" })],
      [functionCall("search_airport", { query: "Beijing" }, { callId: "call_airport_beijing" })],
      [
        functionCall(
          "get_flights",
          {
            departure: "YVR",
            arrival: "PEK",
            departureDate: "2026-08-30",
            returningDate: "2026-09-18",
            personCount: 2,
            currency: "USD",
          },
          { callId: "call_flights" },
        ),
      ],
      [
        functionCall(
          "get_hotels",
          {
            lat: 39.9,
            lon: 116.4,
            checkInDate: "2026-08-30",
            checkOutDate: "2026-09-18",
            person: 2,
            currencyCode: "USD",
          },
          { callId: "call_hotels" },
        ),
      ],
      [
        functionCall(
          "get_attractions",
          {
            lat: 39.9,
            lon: 116.4,
          },
          { callId: "call_attractions" },
        ),
      ],
      [
        // The second turn sees the tool result and finishes the workflow.
        assistantMessage(TEXT_SAMPLE),
      ],
    ]);
    const plannerAgent = createPlannerAgent(model);

    const refs = new Map<string, BookingHandle>();
    const agentContext: TravelAgentContext = { refs: refs };
    // ScriptedModel replaces model I/O; disable tracing separately so this test
    // makes no network requests.
    const runner = new Runner({ tracingDisabled: true });
    const result = await runner.run(
      plannerAgent,
      "Plan a trip from New York to Beijing from Aug 30 to Sep 18th.",
      {
        context: agentContext,
      },
    );

    expect(result.finalOutput).toContain("Beijing");
    expect(model.calls.length).toEqual(10);
    const lastInput = model.lastCall?.request.input as AgentInputItem[];
    expect(Array.isArray(lastInput)).toBe(true);
    expect(lastInput.some((item) => item.type === "function_call_result")).toBe(true);
    const toolResults = lastInput.filter((item) => item.type === "function_call_result");
    expect(toolResults).toHaveLength(9);

    for (const toolResult of toolResults) {
      expect(toolResult.output).toMatchObject({ type: "text" });
      const output = toolResult.output;
      if (
        typeof output === "object" &&
        output !== null &&
        !Array.isArray(output) &&
        "type" in output &&
        output.type === "text"
      ) {
        expect(output.text).not.toContain("failed");
        expect(output.text).not.toContain("unavailable");
        expect(output.text).not.toContain("invalid");
      }
    }

    model.assertComplete();
  });

  test("get_flights populates refs", async () => {
    const model = new ScriptedModel([
      [
        functionCall(
          "get_flights",
          {
            departure: "YVR",
            arrival: "PEK",
            departureDate: "2026-08-30",
            returningDate: "2026-09-18",
            personCount: 2,
            currency: "USD",
          },
          { callId: "call_flights" },
        ),
      ],
      [assistantMessage(TEXT_SAMPLE)],
    ]);
    const plannerAgent = createPlannerAgent(model);

    const refs = new Map<string, BookingHandle>();
    const agentContext: TravelAgentContext = { refs: refs };

    const runner = new Runner({ tracingDisabled: true });
    const result = await runner.run(
      plannerAgent,
      "Plan a trip from New York to Beijing from Aug 30 to Sep 18th.",
      {
        context: agentContext,
      },
    );
    expect(result.runContext.context.refs.get("flt_0")).toEqual({
      kind: expect.any(String),
      token: expect.any(String),
    });
    model.assertComplete();
  });

  test("The agent should throw after exceeding max turn. ", async () => {
    const model = new ScriptedModel([
      [
        functionCall(
          "get_lat_lon",
          { city: "New York", countryCode: null },
          { callId: "call_lat_lon_nyc" },
        ),
      ],
      [
        functionCall(
          "get_lat_lon",
          { city: "Beijing", countryCode: null },
          { callId: "call_lat_lon_beijing" },
        ),
      ],
      [
        functionCall(
          "get_weather",
          { lat: 40.7127281, lon: -74.0060152, unit: "metric" },
          { callId: "call_weather_nyc" },
        ),
      ],
      [
        functionCall(
          "get_weather",
          { lat: 39.9, lon: 116.4, unit: "metric" },
          { callId: "call_weather_beijing" },
        ),
      ],
    ]);
    const plannerAgent = createPlannerAgent(model);

    const runner = new Runner({ tracingDisabled: true });
    await expect(
      runner.run(plannerAgent, "Plan a trip from New York to Beijing from Aug 30 to Sep 18th.", {
        maxTurns: 3,
      }),
    ).rejects.toThrow(MaxTurnsExceededError);
  });
});

describe("Formatter agent", () => {
  test("The formatter returns correctly formatted data. ", async () => {
    const model = new ScriptedModel([[assistantMessage(JSON.stringify(SAMPLE_FORMATTER_OUTPUT))]]);
    const formatterAgent = createFormatterAgent(model);
    const runner = new Runner({ tracingDisabled: true });
    const result = await runner.run(formatterAgent, "Format this data: ...");

    expect(result.finalOutput).toEqual(SAMPLE_FORMATTER_OUTPUT);
  });

  test("The formatter rejects incorrectly formatted data", async () => {
    const model = new ScriptedModel([[assistantMessage(JSON.stringify({ events: [] }))]]);
    const formatterAgent = createFormatterAgent(model);
    const runner = new Runner({ tracingDisabled: true });
    await expect(runner.run(formatterAgent, "Format this data: ...")).rejects.toThrow(
      ModelBehaviorError,
    );
    model.assertComplete();
  });
});
