import { FormInputData, FormSchema, TripStream } from "@/app/type";
import { formatterAgent, plannerAgent } from "@/app/utils/agent";
import { planTrip } from "@/app/utils/planTrip";
import { withJsonBody } from "@/app/utils/withJsonBody";

export const POST = withJsonBody(FormSchema, async (inputData: FormInputData, req: Request) => {
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
        const stream = planTrip(inputData, req.signal, plannerAgent, formatterAgent);
        for await (const event of stream) {
          send(event);
        }
      } catch (error) {
        console.log(error);
        send({
          type: "error",
          message: "Agent run failed.",
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
});
