import { FunctionTool, RunContext } from "@openai/agents";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, test, vi } from "vitest";
import { server } from "../test-setup";
import type { ErrorMessages, TravelAgentContext } from "@/app/type";

const FAILURES = [
  {
    label: "401 Unauthorized",
    kind: "credentials",
    respond: () => HttpResponse.json({ error: "Not Authorized" }, { status: 401 }),
  },
  {
    label: "402 Payment Required",
    kind: "credentials",
    respond: () => HttpResponse.json({ error: "Payment required" }, { status: 402 }),
  },
  {
    label: "429 Payment Required",
    kind: "retryable",
    respond: () => HttpResponse.json({ error: "Too many request" }, { status: 429 }),
  },
  {
    label: "503 upstream down",
    kind: "retryable",
    respond: () => new HttpResponse(null, { status: 503 }),
  },
  { label: "network failure", kind: "retryable", respond: () => HttpResponse.error() },
  {
    label: "404 not found",
    kind: "generic",
    respond: () => HttpResponse.json({ error: "Nope" }, { status: 404 }),
  },
  {
    label: "malformed payload",
    kind: "generic",
    respond: () => HttpResponse.json({ data: "Invalid" }),
  },
  { label: "non-JSON body", kind: "generic", respond: () => new HttpResponse("<html>oops</html>") },
] as const satisfies ReadonlyArray<{
  label: string;
  kind: keyof ErrorMessages;
  respond: () => Response;
}>;

export function testUpstreamFailures({
  tool,
  endpoint,
  args,
  messages,
}: {
  tool: FunctionTool<unknown, any, any> | FunctionTool<TravelAgentContext, any, any>;
  endpoint: string;
  args: unknown;
  messages: ErrorMessages;
}) {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test.for(FAILURES)("$label returns the $kind guidance", async ({ respond, kind }) => {
    server.use(http.get(endpoint, respond));
    const result = await tool.invoke(new RunContext(), JSON.stringify(args));
    expect(result).toBe(messages[kind]);
  });
}
