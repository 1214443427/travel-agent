import { beforeEach, describe, expect, test, vi } from "vitest";
import { server } from "../test-setup";
import { http } from "msw";
import { Contract } from "@/app/utils/contract";
import z from "zod";
import { fetchInternalAPI } from "@/app/utils/clientFetching";

const testContract = {
  requestSchema: z.any(),
  responseSchema: z.object({
    data: z.string(),
  }),
} satisfies Contract;

describe("fetchInternalAPI", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  test("returns parsed JSON object", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    server.use(
      http.post("/test", () => {
        return Response.json(
          {
            data: "test",
          },
          { status: 200 },
        );
      }),
    );
    const result = await fetchInternalAPI("/test", testContract, { request: "requestBody" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.data).toEqual({
      data: "test",
    });
    expect(spy).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({ body: JSON.stringify({ request: "requestBody" }) }),
    );
  });

  test("returns error when failed to find an end point", async () => {
    const result = await fetchInternalAPI("/not-exist", testContract, { request: "requestBody" });
    expect(result).toEqual({
      ok: false,
      message: "Failed to connect to the server. Please try again later.",
    });
  });

  test("returns error when server's response breaches contract.", async () => {
    server.use(
      http.post("/test", () => {
        return Response.json(
          {
            notData: 123,
          },
          { status: 200 },
        );
      }),
    );
    const result = await fetchInternalAPI("/test", testContract, { request: "requestBody" });
    expect(result).toEqual({
      ok: false,
      message: "We encountered an issue with the server.",
    });
  });

  test("returns error for non JSON response.", async () => {
    server.use(
      http.post("/test", () => {
        return new Response(`<!DOCTYPE html><title>Hello World</title><html></html>`, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=UTF-8" },
        });
      }),
    );
    const result = await fetchInternalAPI("/test", testContract, { request: "requestBody" });
    expect(result).toEqual({
      ok: false,
      message: "We encountered an issue with the server.",
    });
  });

  test("returns error sent by the server", async () => {
    server.use(
      http.post("/test", () => {
        return Response.json(
          { message: "Payment Required" },
          {
            status: 402,
          },
        );
      }),
    );
    const result = await fetchInternalAPI("/test", testContract, { request: "requestBody" });
    expect(result).toEqual({
      ok: false,
      message: "Payment Required",
    });

    server.use(
      http.post("/test", () => {
        return Response.json(
          { message: null },
          {
            status: 402,
          },
        );
      }),
    );
    const resultGeneric = await fetchInternalAPI("/test", testContract, { request: "requestBody" });
    expect(resultGeneric, "fall back to generic message").toEqual({
      ok: false,
      message: "We encountered an issue with the server.",
    });
  });
});
