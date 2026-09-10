import { http, HttpResponse } from "msw";
import { server } from "../test-setup";
import { TripStream } from "@/app/type";
import { onTestFinished } from "vitest";

const frame = (data: any) => `data:${data} \n\n`;

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

  const sendRaw = async (rawData: any) => {
    await ready;
    streamController.enqueue(encoder.encode(rawData));
  };

  const error = async (error: any) => {
    await ready;
    streamController.error(error);
  };

  const close = async () => {
    await ready;
    streamController.close();
  };

  onTestFinished(() => {
    try {
      streamController?.close();
    } catch (error) {}
  });

  return { ready, send, sendRaw, error, close };
}
