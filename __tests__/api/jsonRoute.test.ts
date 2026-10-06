import { jsonRoute } from "@/app/api/jsonRoute";
import { APIError } from "@/app/type";
import { Contract } from "@/app/utils/contract";
import { describe, expect, test } from "vitest";
import z from "zod";

const testContract = {
  requestSchema: z.object({
    name: z.string(),
    number: z.number(),
  }),
  responseSchema: z.object({
    id: z.number(),
    description: z.string(),
  }),
} satisfies Contract;

describe("jsonRoute", () => {
  test("returns error thrown by handler", async () => {
    const route = jsonRoute(testContract, () => {
      throw new Error();
    });
    const request = new Request("https://localhost:3000/", {
      method: "POST",
      body: JSON.stringify({
        name: "abc",
        number: 123,
      }),
    });
    const result = await route(request);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect((await result.json()).message).toBe("Unexpected server error.");
  });

  test("echos error message if handler throws API error", async () => {
    const route = jsonRoute(testContract, () => {
      throw new APIError(400, "Bad Request");
    });
    const request = new Request("https://localhost:3000/", {
      method: "POST",
      body: JSON.stringify({
        name: "abc",
        number: 123,
      }),
    });
    const result = await route(request);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect((await result.json()).message).toBe("Bad Request");
  });

  test("calls the handler and passes the result", async () => {
    const route = jsonRoute(testContract, async ({ name, number }) => {
      return {
        id: number,
        description: `${name} is booked.`,
      };
    });

    const request = new Request("https://localhost:3000/", {
      method: "POST",
      body: JSON.stringify({
        name: "abc",
        number: 123,
      }),
    });
    const result = await route(request);
    expect(result.ok).toBe(true);
    expect(await result.json()).toEqual({
      id: 123,
      description: "abc is booked.",
    });
  });
});
