import { beforeEach, describe, expect, test } from "vitest";
import { server } from "../test-setup";
import { delay, http, HttpResponse } from "msw";
import { fetchAPI, fetchRapidAPI } from "@/app/utils/fetching";
import { FetchError } from "@/app/type";

describe("fetchAPI function", () => {
  test("Should aborts a slow request", async () => {
    let seen;
    server.use(
      http.get("https://fakeapi.com/api/trip", async ({ request }) => {
        seen = request;
        await delay(100);
        return HttpResponse.json({});
      }),
    );
    const result = fetchAPI("https://fakeapi.com/api/trip?appid=123456", {}, 100);
    await expect(result).rejects.toThrow();
    expect(seen!.signal).toBeInstanceOf(AbortSignal);
  });

  test("Should throw on non JSON response.", async () => {
    server.use(
      http.get("https://fakeapi.com/api/trip", () => {
        return new HttpResponse("Hello", { status: 200 });
      }),
    );
    await expect(fetchAPI("https://fakeapi.com/api/trip?appid=123456")).rejects.haveOwnProperty(
      "message",
      "Response was not valid JSON",
    );
  });

  test("Should hide API information on failed fetches.", async () => {
    server.use(
      http.get("https://fakeapi.com/api/trip", () => {
        return HttpResponse.json({ error: "Bad Request" }, { status: 400 });
      }),
    );
    await expect(fetchAPI("https://fakeapi.com/api/trip?appid=123456")).rejects.toMatchObject(
      new FetchError(400, "API responded with error", "https://fakeapi.com/api/trip?appid=***"),
    );
  });
});

describe("fetchRapidAPI function", () => {
  test("Should attach the correct headers", async () => {
    let seen;
    server.use(
      http.get("https://fakeapi.com/api/trip", ({ request }) => {
        seen = request;
        return HttpResponse.json({ data: "data" });
      }),
    );

    await fetchRapidAPI("https://fakeapi.com/api/trip", "mockhost");
    expect(seen).not.toBe(undefined);
    expect(seen!.headers.get("x-rapidapi-key")).toBe(process.env.RAPID_API_KEY);
    expect(seen!.headers.get("x-rapidapi-host")).toBe("mockhost");
  });
});
