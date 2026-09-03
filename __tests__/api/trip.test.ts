//@vitest-environment node

import { POST } from "@/app/api/trip/route";
import { describe, expect, test, vi } from "vitest";
import { SAMPLE_FORM_BODY } from "../testData/sampleFormData";
import { SAMPLE_RESPONSE_DATA } from "../testData/sampleResponseData";
import { TripStream } from "@/app/type";
import { readEventStream } from "@/app/utils/utils";

const { planTripMock } = vi.hoisted(() => ({ planTripMock: vi.fn() }));
vi.mock("@/app/utils/planTrip", () => ({ planTrip: planTripMock }));

async function post(body: string) {
  return await POST(
    new Request("https://localhost:3000/api/trip", {
      method: "POST",
      body: body,
    }),
  );
}

describe("trip Route", () => {
  const decoder = new TextDecoder();

  test("The route should stream events based on the planTrip function.", async () => {
    planTripMock.mockImplementation(async function* (): AsyncGenerator<TripStream> {
      yield { type: "tool_started", tool: "get_weather" };
      yield { type: "tool_finished", tool: "get_weather" };
      yield { type: "done", output: SAMPLE_RESPONSE_DATA };
    });

    const result = await post(JSON.stringify(SAMPLE_FORM_BODY));
    const stream = result.body;
    expect(stream).not.toBeNull();
    let buffer = "";
    for await (const frame of stream!) {
      buffer += decoder.decode(frame, { stream: true });
    }

    const frames = buffer.split(" \n\n");
    expect(frames[0]).toBe(`data:${JSON.stringify({ type: "tool_started", tool: "get_weather" })}`);
    expect(frames[1]).toBe(
      `data:${JSON.stringify({ type: "tool_finished", tool: "get_weather" })}`,
    );
    expect(frames[2]).toBe(
      `data:${JSON.stringify({ type: "done", output: SAMPLE_RESPONSE_DATA })}`,
    );
  });

  test("Each event arrives on its own, and not together as a single body.", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve)); //make release a function that resolves the gate;
    planTripMock.mockImplementation(async function* (): AsyncGenerator<TripStream> {
      yield { type: "tool_started", tool: "get_weather" };
      await gate;
      yield { type: "tool_finished", tool: "get_weather" };
    });

    const result = await post(JSON.stringify(SAMPLE_FORM_BODY));
    const stream = result.body;

    const eventStream = readEventStream(stream!);

    const first = await Promise.race([
      eventStream.next(),
      new Promise<never>(
        (_, reject) =>
          setTimeout(() => reject(new Error("route buffered instead of streaming")), 500), // Fast fail in the case if the events was not streamed.
      ),
    ]);
    expect(first.value).toEqual({ type: "tool_started", tool: "get_weather" });
    release();
    expect((await eventStream.next()).value).toEqual({
      type: "tool_finished",
      tool: "get_weather",
    });
  });

  test("returns 400 when the input is non-JSON.", async () => {
    const result = await post("Not even JSON");
    const data = await result.json();
    expect(result.status).toBe(400);
    expect(data.statusText).toBe("Bad request");
    expect(data.message).toBe("The request is malformed.");
  });

  test("returns 400 when the input is malformed JSON.", async () => {
    const result = await post(
      JSON.stringify({ from: "Vancouver", to: "Beijing", travelerCount: "Not-A-Number" }),
    );
    const data = await result.json();
    expect(result.status).toBe(400);
    expect(data.statusText).toBe("Bad request");
    expect(data.message).toBe("The request is malformed.");
  });

  test("returns errors when planTrip throws.", async () => {
    planTripMock.mockImplementation(async function* (): AsyncGenerator<TripStream> {
      throw new Error("LLM failed to produce a final output.");
    });

    const result = await post(JSON.stringify(SAMPLE_FORM_BODY));
    const stream = result.body;

    const eventStream = readEventStream(stream!);
    const event = await eventStream.next();
    expect(event.value).toEqual({
      type: "error",
      message: "LLM failed to produce a final output.",
    });
  });
});
