import { FormSchema, TripStream } from "@/app/type";
import { planTrip } from "@/app/utils/planTrip";

export async function POST(req: Request) {
  let data;
  try {
    data = await req.json();
  } catch (error) {
    console.log(error);
    return Response.json(
      {
        statusText: "Bad request",
        message: "The request is malformed. ",
      },
      { status: 400 },
    );
  }
  const parsedResult = FormSchema.safeParse(data);
  if (!parsedResult.success) {
    return Response.json(
      {
        statusText: "Bad request",
        message: "The request is malformed. ",
      },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: TripStream) => {
        if (req.signal.aborted) return;
        const data = JSON.stringify(event);
        try {
          controller.enqueue(encoder.encode(`data:${data} \n\n`));
        } catch {
          console.error("Stream is aborted. ");
        }
      };

      try {
        const stream = planTrip(parsedResult.data, req.signal);
        for await (const event of stream) {
          send(event);
        }
      } catch (error) {
        console.log(error);
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Agent run failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
      Connection: "keep-alive",
    },
  });
}
