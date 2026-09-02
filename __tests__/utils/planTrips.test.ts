//@vitest-environment node

import { TripStream } from "@/app/type";
import { createFormatterAgent, createPlannerAgent } from "@/app/utils/agent";
import { planTrip } from "@/app/utils/planTrip";
import { assistantMessage, functionCall, ScriptedModel } from "@openai/agents/testing";
import { describe, expect, test } from "vitest";
import { SAMPLE_FORM_INPUT } from "../testData/sampleFormData";
import { SAMPLE_FORMATTER_OUTPUT } from "../testData/sampleResponseData";

describe("planTrips", () => {
  test("The function should generate events based on model actions.", async () => {
    const plannerModel = new ScriptedModel([
      [
        functionCall(
          "get_lat_lon",
          { city: "New York", countryCode: null },
          { callId: "call_lat_lon_nyc" },
        ),
      ],
      [assistantMessage("Text Response")],
    ]);
    const formatterModel = new ScriptedModel([
      [assistantMessage(JSON.stringify(SAMPLE_FORMATTER_OUTPUT))],
    ]);
    const plannerAgent = createPlannerAgent(plannerModel);
    const formatterAgent = createFormatterAgent(formatterModel);
    const events: TripStream[] = [];

    const stream = planTrip(
      SAMPLE_FORM_INPUT,
      new AbortController().signal,
      plannerAgent,
      formatterAgent,
    );

    for await (const event of stream) {
      events.push(event);
    }

    console.log(events);

    expect(events[0]).toEqual({ type: "tool_started", tool: "get_lat_lon" });
    expect(events[1]).toEqual({ type: "tool_finished", tool: "get_lat_lon" });
    expect(events[2]).toEqual({ type: "tool_started", tool: "format_itinerary" });
    expect(events[3]).toEqual({ type: "tool_finished", tool: "format_itinerary" });
    expect(events[4]).toEqual({ type: "done", output: { ...SAMPLE_FORMATTER_OUTPUT, refs: {} } });
  });

  test("throws if planner did not return an itinerary. ", async () => {
    const plannerModel = new ScriptedModel([
      [
        functionCall(
          "get_lat_lon",
          { city: "New York", countryCode: null },
          { callId: "call_lat_lon_nyc" },
        ),
      ],
      [assistantMessage("")],
    ]);
    const formatterModel = new ScriptedModel([
      [assistantMessage(JSON.stringify(SAMPLE_FORMATTER_OUTPUT))],
    ]);
    const plannerAgent = createPlannerAgent(plannerModel);
    const formatterAgent = createFormatterAgent(formatterModel);

    const events: TripStream[] = [];
    const stream = planTrip(
      SAMPLE_FORM_INPUT,
      new AbortController().signal,
      plannerAgent,
      formatterAgent,
    );
    await expect(async () => {
      for await (const event of stream) {
        events.push(event);
      }
    }).rejects.toThrow("LLM failed to produce a final output.");

    expect(events.some((event) => event.type === "done")).toBe(false);
    expect(events.some((event) => "tool" in event && event.tool === "format_itinerary")).toBe(
      false,
    );
  });

  //   test("throws if formatter did not return a proper output. ", async () => {
  //     const plannerModel = new ScriptedModel([[assistantMessage("Text Response")]]);
  //     const formatterModel = new ScriptedModel([[assistantMessage("")]]);
  //     const plannerAgent = createPlannerAgent(plannerModel);
  //     const formatterAgent = createFormatterAgent(formatterModel);

  //     const events: TripStream[] = [];
  //     const stream = planTrip(
  //       SAMPLE_FORM_INPUT,
  //       new AbortController().signal,
  //       plannerAgent,
  //       formatterAgent,
  //     );
  //     await expect(async () => {
  //       for await (const event of stream) {
  //         events.push(event);
  //       }
  //     }).rejects.toThrow("Formatter failed to produce a final output.");
  //   });
});
