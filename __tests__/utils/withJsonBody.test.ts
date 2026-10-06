import { Contract } from "@/app/utils/contract";
import { withJsonBody } from "@/app/utils/withJsonBody";
import { describe, expect, test, vi } from "vitest";
import z from "zod";

const testContract = {
  requestSchema: z.object({
    name: z.string(),
    number: z.number(),
  }),
  responseSchema: z.object(),
} satisfies Contract;

describe("withJsonBody", () => {
  test("accepts correctly formatted request", async () => {
    const mockHandler = vi.fn(({}) => Response.json({ data: "test-response" }));
    const route = withJsonBody(testContract.requestSchema, mockHandler);
    const request = new Request("https://localhost:3000/", {
      method: "POST",
      body: JSON.stringify({
        name: "abc",
        number: 123,
      }),
    });
    const result = await route(request);
    expect(result.ok).toBe(true);
    expect(mockHandler).toHaveBeenCalledExactlyOnceWith(
      {
        name: "abc",
        number: 123,
      },
      request,
    );
    expect(await result.json()).toEqual({ data: "test-response" });
  });

  test("rejects non JSON request", async () => {
    const route = withJsonBody(testContract.requestSchema, ({}) => new Response());
    const result = await route(
      new Request("https://localhost:3000/", {
        method: "POST",
        body: "non-JSON",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect((await result.json()).message).toBe("The request is malformed.");
  });

  test("rejects malformed requests", async () => {
    const route = withJsonBody(testContract.requestSchema, ({}) => new Response());
    const result = await route(
      new Request("https://localhost:3000/", {
        method: "POST",
        body: JSON.stringify({
          number: "abc",
        }),
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect((await result.json()).message).toBe("The request is malformed.");
  });
});
