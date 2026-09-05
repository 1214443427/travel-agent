//@vitest-environment node
import { combineClassName, constructUrl, parseData, readEventStream } from "@/app/utils/utils";
import { expect, test, vi, describe } from "vitest";
import z, { ZodError } from "zod";
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

  function byteStream(data: string, bytePerChunk: number): ReadableStream<Uint8Array<ArrayBuffer>> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    console.log(bytes);
    return new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += bytePerChunk) {
          const chunk = bytes.slice(i, i + bytePerChunk);
          controller.enqueue(chunk);
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

  async function collect(stream: ReadableStream<Uint8Array<ArrayBuffer>>) {
    const out: TripStream[] = [];
    for await (const event of readEventStream(stream)) out.push(event);
    return out;
  }

  test("The function should parse properly formatted streams.", async () => {
    const stream = eventStream(toolStartFrame, toolFinishFrame, doneFrame);
    const readEvents = await collect(stream);
    expect(readEvents[0]).toEqual(events.toolStart);
    expect(readEvents[1]).toEqual(events.toolEnd);
    expect(readEvents[2]).toEqual(events.done);
  });

  test("The function should parse a chunk with two events properly.", async () => {
    const stream = eventStream(toolStartFrame + toolFinishFrame, doneFrame);
    const readEvents = await collect(stream);
    expect(readEvents[0]).toEqual(events.toolStart);
    expect(readEvents[1]).toEqual(events.toolEnd);
    expect(readEvents[2]).toEqual(events.done);
  });

  test("The function should handle one frame split across multiple chunks correctly.", async () => {
    const stream = byteStream(doneFrame, 10);
    const readEvents = await collect(stream);
    expect(readEvents[0]).toEqual(events.done);
  });

  test("The function should continue parsing after corrupted streams.", async () => {
    const stream = eventStream(toolStartFrame, `data: Corruption \n\n`, doneFrame);
    const readEvents = await collect(stream);
    expect(readEvents[0]).toEqual(events.toolStart);
    expect(readEvents[1]).toEqual(events.done);
  });

  test("The function should throw if the stream did not end correctly.", async () => {
    const stream = eventStream(`data: ${JSON.stringify({ type: "tool_started" })}`);
    await expect(collect(stream)).rejects.toThrow("The event stream ended mid-frame.");
  });

  test("The function should throw on excessively large stream.", async () => {
    const stream = eventStream("a".repeat(1000001));
    await expect(collect(stream)).rejects.toThrow(
      "Event stream frame exceeded maximum allowed size.",
    );
  });

  test("The function should log invalid formatted events.", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const stream = eventStream(`data: ${JSON.stringify({ type: "tool_started" })}\n\n`);
    const readEvents = await collect(stream);
    expect(spy).toHaveBeenCalledWith("received invalid stream event", expect.any(ZodError));
    expect(readEvents).toEqual([]);
    spy.mockClear();
  });

  test("The function should parse multi-byte characters split across chunks correctly", async () => {
    const toolWithEmoji = { type: "tool_started", tool: "🙈️🙈️🙈️" };
    const emojiFrame = frame(toolWithEmoji);

    const stream = byteStream(emojiFrame, 3);
    const readEvents = await collect(stream);
    expect(readEvents).toEqual([toolWithEmoji]);
  });
});

describe("combineClassName", () => {
  const baseClass = "flex flex-col";
  const addedClass = "justify-center";
  test("The function should combine the two className string.", () => {
    expect(combineClassName(baseClass, addedClass)).toBe("flex flex-col justify-center");
  });

  test("The function should return normally when second class it not provided.", () => {
    expect(combineClassName(baseClass)).toBe("flex flex-col");
  });
});
