import { FormSchema, TripStream } from "@/app/type";
import { agent } from "@/app/utils/agent";
import { run } from "@openai/agents";

export async function POST(req: Request) {
  const data = await req.json();
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
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data:${data} \n\n`));
      };

      try {
        const result = await run(agent, JSON.stringify(parsedResult.data), {
          stream: true,
          maxTurns: 12,
          signal: req.signal,
          context: { location: "Vancouver, Canada" },
        });

        for await (const event of result) {
          if (event.type !== "run_item_stream_event") continue; // skip raw token events
          if (event.name === "tool_called" && event.item.rawItem.type === "function_call") {
            send({ type: "tool_started", tool: event.item.rawItem.name });
          } else if (
            event.name === "tool_output" &&
            event.item.rawItem.type === "function_call_result"
          ) {
            send({ type: "tool_finished", tool: event.item.rawItem.name });
          }
        }

        await result.completed;
        send({ type: "done", output: result.finalOutput });

        console.log(result.finalOutput);
      } catch (error) {
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
