import { FormSchema } from "@/app/type";
import { agent } from "@/app/utils/config";
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

  agent.on("agent_start", (ctx, agent) => console.log("▶", agent.name));
  agent.on("agent_tool_start", (ctx, tool, details) =>
    console.log("🔧", tool.name, details?.toolCall),
  );
  agent.on("agent_tool_end", (ctx, agent, tool, result) => console.log("✅", tool, result));
  agent.on("agent_end", (ctx, output) => console.log("⏹", output));

  console.log(result.finalOutput);
}
