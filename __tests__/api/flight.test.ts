import { POST } from "@/app/api/flight/route";
import { BookingHandle, FlightDetails } from "@/app/type";
import { flightRouteContract } from "@/app/utils/contract";
import { describe, expect, test, vi } from "vitest";
import { server } from "../test-setup";
import { http, HttpResponse } from "msw";
import { SAMPLE_FLIGHT_DETAILS } from "../testData/sampleFlightDataWithNextToken";

async function post(body: BookingHandle) {
  return await POST(
    new Request("https://localhost:3000/api/flight", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

const testHandle: BookingHandle = {
  kind: "booking",
  token: "test-token",
};

describe("/api/flight route", () => {
  test("returns data in the expected format.", async () => {
    const result = await post(testHandle);

    expect(result.ok).toBe(true);
    const data = await result.json();

    const parse = flightRouteContract.responseSchema.safeParse(data);
    expect(parse.success).toBe(true);
  });

  test("fetch request contains the correct parameters.", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await post(testHandle);
    const url = fetchSpy.mock.calls[0][0] as URL;
    const paramOptions = Object.fromEntries(url.searchParams.entries());
    expect(paramOptions).toEqual({
      booking_token: "test-token",
      currency: "USD",
    });
  });

  test("errors if the booking handle has incorrect type.", async () => {
    const result = await post({ ...testHandle, kind: "next" });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    const data = await result.json();

    expect(data.message).toBe(
      "Expected a booking token. Please try booking directly from airline.",
    );
  });

  test("returns error if API returned data in unexpected format", async () => {
    server.use(
      http.get("https://google-flights2.p.rapidapi.com/api/v1/getBookingDetails", () => {
        return HttpResponse.json({ data: "Malformed Data" }, { status: 200 });
      }),
    );
    const response = await post(testHandle);
    expect(response.ok).toBe(false);
    const data = await response.json();
    expect(data.message).toBe(
      "We encountered an unexpected error. Please try booking directly from the airline. ",
    );
  });

  test("returns error if API returned an error", async () => {
    server.use(
      http.get("https://google-flights2.p.rapidapi.com/api/v1/getBookingDetails", () => {
        return HttpResponse.json({ message: "not found" }, { status: 404 });
      }),
    );
    const response = await post(testHandle);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.message).toBe(
      "We encountered an error when retrieving data from our flight information provider. Please try booking directly from the airline. ",
    );
  });

  test("returns 500 as fallback error.", async () => {
    server.use(
      http.get("https://google-flights2.p.rapidapi.com/api/v1/getBookingDetails", () => {
        return Response.error();
      }),
    );
    const response = await post(testHandle);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.message).toBe(
      "We encountered an error when retrieving data from our flight information provider. Please try booking directly from the airline. ",
    );
  });

  test("prioritizes airline offerings", async () => {
    server.use(
      http.get("https://google-flights2.p.rapidapi.com/api/v1/getBookingDetails", () => {
        return HttpResponse.json<FlightDetails>({
          ...SAMPLE_FLIGHT_DETAILS,
          data: [
            {
              is_airline: false,
              meta: {
                features: ["free carry-on"],
              },
              price: 1234,
              title: "Test non-airline",
              token: "test-token-booking-1",
            },
            {
              is_airline: true,
              meta: {
                features: ["free carry-on"],
              },
              price: 1234,
              title: "Test Airline",
              token: "test-token-booking-2",
            },
          ],
        });
      }),
    );
    const response = await post(testHandle);
    expect(response.ok).toBe(true);
    const data = await response.json();
    const parsed = flightRouteContract.responseSchema.parse(data);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].is_airline).toBe(true);
    expect(parsed.data[0].title).toBe("Test Airline");
  });

  test("fallback to non-airline offers if no airline offers are alliable.", async () => {
    server.use(
      http.get("https://google-flights2.p.rapidapi.com/api/v1/getBookingDetails", () => {
        return HttpResponse.json<FlightDetails>({
          ...SAMPLE_FLIGHT_DETAILS,
          data: [
            {
              is_airline: false,
              meta: {
                features: ["free carry-on"],
              },
              price: 1234,
              title: "Test non-airline",
              token: "test-token-booking",
            },
          ],
        });
      }),
    );
    const response = await post(testHandle);
    expect(response.ok).toBe(true);
    const data = await response.json();
    const parsed = flightRouteContract.responseSchema.parse(data);
    expect(parsed.data).toHaveLength(1);
  });
});
