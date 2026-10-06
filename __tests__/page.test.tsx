import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";
import userEvent from "@testing-library/user-event";
import { fillValidForm, submitForm } from "./helper/formActions";
import createTripRouteHandler from "./helper/createTripRouteHandler";
import { SAMPLE_RESPONSE_DATA } from "./testData/sampleResponseData";
import {
  SAMPLE_BOOKING_URL,
  SAMPLE_FLIGHT_DETAILS,
} from "./testData/sampleFlightDataWithNextToken";
import { SAMPLE_HOTEL_DETAILS_DATA } from "./testData/sampleHotelDetailsData";

describe("Page", () => {
  test("The start component renders as expected.", () => {
    render(<Page />);
    expect(
      screen.getByRole("img", {
        name: "Cat wearing captain's hat is sitting next to a luggage bag.",
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", {
        name: "Let's Begin",
      }),
    ).toBeDefined();
  });

  test("walks from start to result page.", async () => {
    render(<Page />);
    const { send, close } = createTripRouteHandler();
    const openSpy = vi.spyOn(window, "open");

    const user = userEvent.setup();
    const startBtn = screen.getByRole("button", {
      name: "Let's Begin",
    });

    await user.click(startBtn);
    expect(screen.getByRole("form", { name: "Trip Form" })).toBeInTheDocument();
    expect(startBtn).not.toBeInTheDocument();
    await fillValidForm(user);
    await submitForm(user);
    await send({ type: "done", output: SAMPLE_RESPONSE_DATA });
    await close();

    expect(await screen.findByText("Your Trip")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Trip Form" })).not.toBeInTheDocument();

    expect(screen.queryByText("Hotel in Beijing")).toBeInTheDocument();
    const bookBtns = screen.getAllByRole("button", { name: "Book" });
    expect(bookBtns.length).toBe(2);

    await user.click(bookBtns[0]);
    expect(await screen.findByRole("heading", { name: "Flight Options" })).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_FLIGHT_DETAILS.data[0].cabin.toLowerCase())).toBeInTheDocument();

    const flightBookingBtn = screen.getByRole("button", {
      name: `$${SAMPLE_FLIGHT_DETAILS.data[0].price}`,
    });
    expect(flightBookingBtn).toBeInTheDocument();

    await user.click(flightBookingBtn);
    expect(await screen.findByText("Continue on an external website")).toBeInTheDocument();
    const bookBtn = screen.getByRole("button", { name: "Go" });
    await user.click(bookBtn);

    expect(openSpy).toHaveBeenCalledExactlyOnceWith(SAMPLE_BOOKING_URL.data, "_blank");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    await user.click(bookBtns[1]);
    expect(screen.getByText("Hotel Details")).toBeInTheDocument();
    expect(screen.queryByText("Flight Options")).not.toBeInTheDocument();

    expect(screen.getByText(SAMPLE_HOTEL_DETAILS_DATA.data.hotel_name)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(SAMPLE_HOTEL_DETAILS_DATA.data.property_highlight_strip[0].name)),
    ).toBeInTheDocument();

    const attractionDetailsBtn = screen.getAllByRole("button", { name: "View Details" })[0];

    await user.click(attractionDetailsBtn);
    const attractionAction = SAMPLE_RESPONSE_DATA.events
      .map((event) => event.action)
      .find((action) => action?.type === "view_attraction");
    expect(openSpy).toHaveBeenLastCalledWith(expect.stringContaining(attractionAction!.wikipedia));

    const returnBtn = screen.getByRole("button", { name: "Plan Another Trip" });
    await user.click(returnBtn);
    expect(
      screen.getByRole("button", {
        name: "Let's Begin",
      }),
    ).toBeInTheDocument();
  });
});
