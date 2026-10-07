import { describe, expect, test, vi } from "vitest";
import { server } from "../test-setup";
import { http, HttpResponse } from "msw";
import { BookingApiType } from "@/app/type";
import { bookRouteContract } from "@/app/utils/contract";
import { POST } from "@/app/api/book/route";

async function post(body: BookingApiType) {
  return await POST(
    new Request("https://localhost:3000/api/book", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

const testBody: BookingApiType = {
  token: "abc",
};

describe("/api/book route", () => {
  test("returns data in the expected format.", async () => {
    const result = await post(testBody);
    expect(result.ok).toBe(true);
    const data = await result.json();
    const parse = bookRouteContract.responseSchema.safeParse(data);
    expect(parse.success).toBe(true);
  });

  test("fetch request posts the correct content.", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await post(testBody);
    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(
      "https://google-flights2.p.rapidapi.com/api/v1/getBookingURL",
      {
        method: "POST",
        body: JSON.stringify({ token: "abc" }),
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "google-flights2.p.rapidapi.com",
          "x-rapidapi-key": "test-rapid-key",
        },
        signal: expect.anything(),
      },
    );
  });

  test("returns error if API returned data in unexpected format", async () => {
    server.use(
      http.post("https://google-flights2.p.rapidapi.com/api/v1/getBookingURL", () => {
        return HttpResponse.json({ data: 123 }, { status: 200 });
      }),
    );
    const response = await post(testBody);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.message).toBe(
      "We encountered an error when retrieving data from our flight information provider. Please try booking directly from the airline.",
    );
  });

  test("returns 502 for all upstream errors", async () => {
    server.use(
      http.post("https://google-flights2.p.rapidapi.com/api/v1/getBookingURL", () => {
        return HttpResponse.json({ data: "not found" }, { status: 404 });
      }),
    );
    const response = await post(testBody);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.message).toBe(
      "Failed to fetch booking URL. Please try booking directly from the airline. ",
    );
  });

  test("fetch network failure returns an error. ", async () => {
    server.use(
      http.post("https://google-flights2.p.rapidapi.com/api/v1/getBookingURL", () => {
        return HttpResponse.error();
      }),
    );
    const response = await post(testBody);
    expect(response.status).toBe(502);
    expect((await response.json()).message).toBe(
      "Failed to fetch booking URL. Please try booking directly from the airline. ",
    );
  });
});
