import { http, HttpResponse } from "msw";
import { server } from "../test-setup";
import { TripStream } from "@/app/type";
import { onTestFinished } from "vitest";

const frame = (data: string) => `data:${data} \n\n`;

export default function createTripRouteHandler() {
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  let markReady: () => void;
  const ready = new Promise<void>((resolve) => (markReady = resolve));

  server.use(
    http.post("/api/trip", () => {
      const stream = new ReadableStream({
        async start(controller) {
          streamController = controller;
          markReady();
        },
      });
      return new HttpResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "X-Content-Type-Options": "nosniff",
          Connection: "keep-alive",
        },
      });
    }),
  );

  const send = async (data: TripStream) => {
    await ready;
    streamController.enqueue(encoder.encode(frame(JSON.stringify(data))));
  };

  const error = async (error: unknown) => {
    await ready;
    streamController.error(error);
  };

  const close = async () => {
    await ready;
    streamController.close();
  };

  //if a test failed, close the stream to prevent leaking into other test suites
  onTestFinished(() => {
    try {
      streamController?.close();
    } catch {}
  });

  return { ready, send, error, close };
}
