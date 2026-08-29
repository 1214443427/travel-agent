//@vitest-environment node
import { constructUrl, parseData, readEventStream } from "@/app/utils/utils";
import { describe } from "node:test";
import { expect, test } from "vitest";
import z from "zod";
import { SAMPLE_RESPONSE_DATA } from "../testData/sampleResponseData";
import { TripStream } from "@/app/type";

describe("constructUrl", () => {
  const baseUrl = "https://www.flights.com/api/mock";
  test("adds the correct query parameters", () => {
    const queryParameters = {
      sort: "cheapest",
      filter: "economy",
      children: undefined,
    };
    const result = constructUrl(baseUrl, queryParameters);
    expect(result.href).toBe("https://www.flights.com/api/mock?sort=cheapest&filter=economy");
  });

  test("correctly handles spaces and &", () => {
    const queryParameters = {
      sort: "cheapest",
      filter: "economy&economy plus",
      airline: "Air Canada",
    };
    const result = constructUrl(baseUrl, queryParameters);
    expect(result.searchParams.get("filter")).toBe("economy&economy plus");
    expect(result.searchParams.get("airline")).toBe("Air Canada");
  });
});

describe("parseData", () => {
  const mockSchema = z.object({
    mock: z.string(),
  });

  test("The function should on improper formatted data.", () => {
    const fakeData = { notMock: 1 };
    expect(() => parseData(mockSchema, fakeData)).toThrow(
      "The end point returned data with unexpected format.",
    );
  });

  test("The function should remove unwanted field from the data.", () => {
    const fakeData = { mock: "string", notMock: 1 };
    expect(parseData(mockSchema, fakeData)).toEqual({ mock: "string" });
  });
});

describe("readEventStream", () => {
  const frame = (event: unknown) => `data:${JSON.stringify(event)} \n\n`;

  function eventStream(...chunks: string[]): ReadableStream<Uint8Array<ArrayBuffer>> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
  }

  const events = {
    toolStart: { type: "tool_started", tool: "get_flights" },
    toolEnd: { type: "tool_started", tool: "get_flights" },
    done: { type: "done", output: SAMPLE_RESPONSE_DATA },
  };
  const toolStartFrame = frame(events.toolStart);
  const toolFinishFrame = frame(events.toolEnd);
  const doneFrame = frame(events.done);

  async function collect(stream: ReadableStream<Uint8Array>) {
    const out: TripStream[] = [];
    for await (const e of readEventStream(stream as never)) out.push(e);
    return out;
  }

  test("The function should parse properly formatted streams.", async () => {
    const stream = eventStream(toolStartFrame + toolFinishFrame + doneFrame);
    const readEvents = await collect(stream);
    expect(readEvents[0]).toEqual(events.toolStart);
    expect(readEvents[1]).toEqual(events.toolEnd);
    expect(readEvents[2]).toEqual(events.done);
  });

  test("The function should continue parsing after corrupted streams.", async () => {
    const stream = eventStream(toolStartFrame + `data: Corruption \n\n` + doneFrame);
    const readEvents = await collect(stream);
    expect(readEvents[0]).toEqual(events.toolStart);
    expect(readEvents[1]).toEqual(events.done);
  });
});
