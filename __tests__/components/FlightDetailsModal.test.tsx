import FlightDetailsModal from "@/app/components/FlightDetailsModal";
import { render, screen } from "@testing-library/react";
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
    render(<FlightDetailsModal flightDetails={SAMPLE_FLIGHT_DETAILS} closeModal={closeModalFn} />);

    const user = userEvent.setup();
    const bookBtn = screen.getByRole("button", { name: "$780" });
    await user.click(bookBtn);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/book",
      expect.objectContaining({
        body: JSON.stringify({ token: SAMPLE_FLIGHT_DETAILS.data[0].token }),
      }),
    );

    expect(await screen.findByText("Continue on an external website")).toBeInTheDocument();
    const openBtn = screen.getByRole("button", { name: "Go" });
    await user.click(openBtn);

    expect(openSpy).toHaveBeenCalledWith(SAMPLE_BOOKING_URL.data, "_blank", "noopener");

    const closeBtn = screen.getByRole("button", { name: "Close" });

    await user.click(closeBtn);
    expect(closeModalFn).toHaveBeenCalledOnce();
  });

  test("The modal handles server error gracefully", async () => {
    const closeModalFn = vi.fn();
    render(<FlightDetailsModal flightDetails={SAMPLE_FLIGHT_DETAILS} closeModal={closeModalFn} />);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const openSpy = vi.spyOn(window, "open");

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
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    server.use(
      http.post("/api/book", () => {
        return HttpResponse.json(SAMPLE_BOOKING_URL);
      }),
    );

    await user.click(bookBtn);
    expect(await screen.findByText("Continue on an external website")).toBeInTheDocument();
    const openBtn = screen.getByRole("button", { name: "Go" });
    await user.click(openBtn);

    expect(openSpy).toHaveBeenCalledWith(SAMPLE_BOOKING_URL.data, "_blank", "noopener");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("The modal caches URLs.", async () => {
    const closeModalFn = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    // const openSpy = vi.spyOn(window, "open");
    render(<FlightDetailsModal flightDetails={SAMPLE_FLIGHT_DETAILS} closeModal={closeModalFn} />);

    const user = userEvent.setup();
    const bookBtn1 = screen.getByRole("button", { name: "$780" });
    await user.click(bookBtn1);

    await user.click(bookBtn1);

    expect(fetchSpy).toHaveBeenCalledOnce();
    // expect(openSpy).toHaveBeenCalledTimes(2);
    // expect(openSpy).toHaveBeenLastCalledWith(SAMPLE_BOOKING_URL.data, "_blank");
  });

  test("The modal renders multiple flights", () => {
    const closeModalFn = vi.fn();
    render(<FlightDetailsModal flightDetails={SAMPLE_FLIGHT_DETAILS} closeModal={closeModalFn} />);

    const filteredFlights = SAMPLE_FLIGHT_DETAILS.data.filter((flight) => flight.is_airline);
    for (const flight of filteredFlights) {
      expect(screen.getByText(flight.cabin, { exact: false }));
      for (const feature of flight.meta.features) {
        const featureMatcher = new RegExp(feature, "i");
        expect(screen.getAllByText(featureMatcher));
      }
      expect(
        screen.getByRole("button", { name: new RegExp(flight.price.toString()) }),
      ).toBeInTheDocument();
    }
  });

  test("The modal renders fallback values for missing fields", () => {
    render(
      <FlightDetailsModal
        flightDetails={{
          ...SAMPLE_FLIGHT_DETAILS,
          data: [{ title: "Test Flight", is_airline: false, meta: null, price: 123, token: "abc" }],
        }}
        closeModal={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "cabin not listed" })).toBeInTheDocument();
    expect(screen.getByText("Visit the website for more information.")).toBeInTheDocument();
  });

  test("renders loading modal when fetching data", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));

    server.use(
      http.post("/api/book", async () => {
        await gate;
        return HttpResponse.json(SAMPLE_BOOKING_URL);
      }),
    );

    render(<FlightDetailsModal flightDetails={SAMPLE_FLIGHT_DETAILS} closeModal={() => {}} />);
    const user = userEvent.setup();
    const bookBtn1 = screen.getByRole("button", { name: "$780" });
    await user.click(bookBtn1);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    release();
    expect(await screen.findByText("Go")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  test("copy button copies URL for the user", async () => {
    render(<FlightDetailsModal flightDetails={SAMPLE_FLIGHT_DETAILS} closeModal={() => {}} />);
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");

    const user = userEvent.setup();
    const bookBtn1 = screen.getByRole("button", { name: "$780" });
    await user.click(bookBtn1);

    expect(await screen.findByText("Continue on an external website")).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: "Copy" });
    await user.click(copyBtn);

    expect(clipboardSpy).toHaveBeenCalledWith(SAMPLE_BOOKING_URL.data);
  });
});
