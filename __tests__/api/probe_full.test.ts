//@vitest-environment node
import { POST } from "@/app/api/trip/route";
import { describe, expect, test, vi } from "vitest";
import { SAMPLE_FORM_BODY } from "../testData/sampleFormData";
import { SAMPLE_RESPONSE_DATA } from "../testData/sampleResponseData";
import type { TripStream } from "@/app/type";

const { planTripMock } = vi.hoisted(() => ({ planTripMock: vi.fn() }));
vi.mock("@/app/utils/planTrip", () => ({ planTrip: planTripMock }));

const post = () =>
  POST(new Request("https://localhost:3000/api/trip", {
    method: "POST",
    body: JSON.stringify(SAMPLE_FORM_BODY),
  }));

async function* readEvents(res: Response): AsyncGenerator<TripStream> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 2);
      if (frame.startsWith("data:")) yield JSON.parse(frame.slice(5).trim());
    }
  }
}

describe("trip Route", () => {
  test("streams events from planTrip", async () => {
    planTripMock.mockImplementation(async function* (): AsyncGenerator<TripStream> {
      yield { type: "tool_started", tool: "get_weather" };
      yield { type: "tool_finished", tool: "get_weather" };
      yield { type: "done", output: SAMPLE_RESPONSE_DATA };
    });

    const events: TripStream[] = [];
    for await (const e of readEvents(await post())) events.push(e);

    expect(events.map((e) => e.type)).toEqual(["tool_started", "tool_finished", "done"]);
    expect(events.at(-1)).toEqual({ type: "done", output: SAMPLE_RESPONSE_DATA });
    expect(planTripMock).toHaveBeenCalledWith(
      expect.objectContaining({ budget: 8000, travelerCount: 2 }),
      expect.any(AbortSignal), expect.anything(), expect.anything(),
    );
  });

  test("flushes each event as it is produced, not at the end", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));

    planTripMock.mockImplementation(async function* (): AsyncGenerator<TripStream> {
      yield { type: "tool_started", tool: "get_weather" };
      await gate;
      yield { type: "tool_finished", tool: "get_weather" };
    });

    const events = readEvents(await post());
    const first = await Promise.race([
      events.next(),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("route buffered instead of streaming")), 500)),
    ]);
    expect(first.value).toEqual({ type: "tool_started", tool: "get_weather" });

    release();
    expect((await events.next()).value).toEqual({ type: "tool_finished", tool: "get_weather" });
  });

  test("proves resetAllMocks wiped the previous implementation", async () => {
    process.stdout.write(`PROBE impl after reset = ${planTripMock.getMockImplementation()}\n`);
  });
});
