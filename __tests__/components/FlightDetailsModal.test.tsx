import FlightDetailsModal from "@/app/components/FlightDetailsModal";
import { getAllByRole, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import {
  SAMPLE_BOOKING_URL,
  SAMPLE_FLIGHT_DETAILS,
} from "../testData/sampleFlightDataWithNextToken";
import userEvent from "@testing-library/user-event";
import { server } from "../test-setup";
import { http, HttpResponse } from "msw";

describe("Flight details modal", () => {
  test("The modal handles user interactions correctly", async () => {
    const closeModalFn = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const openSpy = vi.spyOn(globalThis, "open");
    render(
      <FlightDetailsModal
        flightDetails={SAMPLE_FLIGHT_DETAILS}
        closeModal={closeModalFn}
        isPending={false}
      />,
    );

    const user = userEvent.setup();
    const bookBtn = screen.getByRole("button", { name: "$780" });
    await user.click(bookBtn);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/book",
      expect.objectContaining({
        body: JSON.stringify({ token: SAMPLE_FLIGHT_DETAILS.data[0].token }),
      }),
    );
    expect(openSpy).toHaveBeenCalledWith(SAMPLE_BOOKING_URL.data, "_blank");

    const closeBtn = screen.getByRole("button", { name: "Close" });

    await user.click(closeBtn);
    expect(closeModalFn).toHaveBeenCalledOnce();
  });

  test("The modal handles server error gracefully", async () => {
    const closeModalFn = vi.fn();
    render(
      <FlightDetailsModal
        flightDetails={SAMPLE_FLIGHT_DETAILS}
        closeModal={closeModalFn}
        isPending={false}
      />,
    );

    server.use(
      http.post("/api/book", () => {
        return HttpResponse.json({ message: "Bad request" }, { status: 400 });
      }),
    );

    const user = userEvent.setup();
    const bookBtn = screen.getByRole("button", { name: "$780" });
    await user.click(bookBtn);

    expect(await screen.findByRole("heading", { name: "Error" })).toBeInTheDocument();
    expect(screen.getByText("Bad request")).toBeInTheDocument();

    const closeBtn = screen.getAllByRole("button", { name: "Close" })[1];
    await user.click(closeBtn);
    expect(screen.queryByRole("heading", { name: "Error" })).not.toBeInTheDocument();
  });

  test("The modal caches URLs.", async () => {
    const closeModalFn = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <FlightDetailsModal
        flightDetails={SAMPLE_FLIGHT_DETAILS}
        closeModal={closeModalFn}
        isPending={false}
      />,
    );

    const user = userEvent.setup();
    const bookBtn1 = screen.getByRole("button", { name: "$780" });
    await user.click(bookBtn1);
    const closeBtn = screen.getByRole("button", { name: "Close" });
    await user.click(closeBtn);
    await user.click(bookBtn1);

    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  test("The modal renders multiple flights", () => {
    const closeModalFn = vi.fn();
    render(
      <FlightDetailsModal
        flightDetails={SAMPLE_FLIGHT_DETAILS}
        closeModal={closeModalFn}
        isPending={false}
      />,
    );

    const filteredFlights = SAMPLE_FLIGHT_DETAILS.data.filter((flight) => flight.is_airline);
    expect(screen.getAllByRole("button").length).toEqual(filteredFlights.length + 1);
    for (const flight of filteredFlights) {
      expect(screen.getByText(flight.cabin, { exact: false }));
      for (const feature of flight.meta.features) {
        const featureMatcher = new RegExp(feature, "i");
        expect(screen.getAllByText(featureMatcher));
      }
    }
  });

  test("The modal renders loading state correctly.", () => {
    const closeModalFn = vi.fn();
    const { rerender } = render(
      <FlightDetailsModal
        flightDetails={SAMPLE_FLIGHT_DETAILS}
        closeModal={closeModalFn}
        isPending={true}
      />,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    rerender(
      <FlightDetailsModal
        flightDetails={SAMPLE_FLIGHT_DETAILS}
        closeModal={closeModalFn}
        isPending={false}
      />,
    );
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  test("The modal renders fallback values for missing fields", () => {
    render(
      <FlightDetailsModal
        flightDetails={{
          ...SAMPLE_FLIGHT_DETAILS,
          data: [{ title: "Test Flight", is_airline: false, meta: null, price: 123, token: "abc" }],
        }}
        closeModal={vi.fn()}
        isPending={false}
      />,
    );
    expect(screen.getByRole("heading", { name: "cabin not listed" })).toBeInTheDocument();
    expect(screen.getByText("Visit the website for more information.")).toBeInTheDocument();
  });
});
