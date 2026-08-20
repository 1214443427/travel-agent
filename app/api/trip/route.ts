import { FormSchema } from "@/app/type";
import { agent } from "@/app/utils/agent";
import { run } from "@openai/agents";

export async function POST(req: Request) {
  const data = await req.json();
  const parsedResult = FormSchema.safeParse(data);
  if (!parsedResult.success) {
    return Response.json({
      status: 400,
      statusText: "Bad request",
      message: "The request is malformed. ",
    });
  }
  const result = await run(agent, JSON.stringify(data), {
    context: { location: "Vancouver, Canada" },
  });

  console.log(result.finalOutput);
}
