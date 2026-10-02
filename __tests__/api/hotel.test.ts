import { POST } from "@/app/api/hotel/route";
import { HotelApiRequest } from "@/app/type";
import { hotelRouteContract } from "@/app/utils/contract";
import { describe, expect, test, vi } from "vitest";
import { server } from "../test-setup";
import { http, HttpResponse } from "msw";

async function post(body: HotelApiRequest) {
  return await POST(
    new Request("https://localhost:3000/api/hotel", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

const testBody = {
  token: "abc",
  arrivalDate: "2026-11-01",
  departureDate: "2026-11-18",
  adults: 2,
};

describe("/api/hotel route", () => {
  test("returns data in the expected format.", async () => {
    const result = await post(testBody);
    expect(result.ok).toBe(true);
    const data = await result.json();
    const parse = hotelRouteContract.responseSchema.safeParse(data);
    expect(parse.success).toBe(true);
  });

  test("fetch request contains the correct parameters.", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await post(testBody);
    const url = fetchSpy.mock.calls[0][0] as URL;
    const paramOptions = Object.fromEntries(url.searchParams.entries());
    expect(paramOptions).toEqual({
      hotel_id: "abc",
      adults: "2",
      arrival_date: "2026-11-01",
      departure_date: "2026-11-18",
    });
  });

  test("returns error if API returned data in unexpected format", async () => {
    server.use(
      http.get("https://booking-com15.p.rapidapi.com/api/v1/hotels/getHotelDetails", () => {
        return HttpResponse.json({ data: "Malformed data" }, { status: 200 });
      }),
    );
    const response = await post(testBody);
    expect(response.ok).toBe(false);
    const data = await response.json();
    expect(data.message).toBe(
      "We encountered an unexpected error. Please try manually look up the hotel.",
    );
  });

  test("returns error if API returned error", async () => {
    server.use(
      http.get("https://booking-com15.p.rapidapi.com/api/v1/hotels/getHotelDetails", () => {
        return HttpResponse.json({ data: "not found" }, { status: 404 });
      }),
    );
    const response = await post(testBody);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.message).toBe(
      "We encountered an error when retrieving data from our hotel information provider. Please try manually look up the hotel.",
    );
  });

  test("fallback to 500 for errors without status. ", async () => {
    server.use(
      http.get("https://booking-com15.p.rapidapi.com/api/v1/hotels/getHotelDetails", () => {
        return HttpResponse.error();
      }),
    );
    const response = await post(testBody);
    expect(response.status).toBe(500);
  });
});
