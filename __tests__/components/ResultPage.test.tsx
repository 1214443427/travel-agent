import ResultPage from "@/app/components/ResultPage";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SAMPLE_RESPONSE_DATA } from "../testData/sampleResponseData";
import userEvent from "@testing-library/user-event";
import { SAMPLE_HOTEL_DETAILS_DATA } from "../testData/sampleHotelDetailsData";
import { server } from "../test-setup";
import { http } from "msw";

describe("ResultPage", () => {
  test("renders the title", () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} setPhase={() => {}} />);
    expect(screen.getByRole("heading", { name: "Your Trip" })).toBeInTheDocument();
  });

  test("renders the duration and location of the travel", () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} setPhase={() => {}} />);
    expect(screen.getByText("→ Aug 30, 27")).toBeInTheDocument();
    expect(screen.getByText("Sep 18, 27 ←")).toBeInTheDocument();
    expect(screen.getByText("Vancouver → Beijing")).toBeInTheDocument();
  });

  test("renders events with heading and description", () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} setPhase={() => {}} />);
    for (const event of SAMPLE_RESPONSE_DATA.events) {
      expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
      expect(screen.getByText(event.description)).toBeInTheDocument();
    }
  });

  test("renders activation buttons for the events", () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} setPhase={() => {}} />);
    const bookEvents = SAMPLE_RESPONSE_DATA.events.filter((event) => {
      return event.action?.type === "book_flight" || event.action?.type === "book_hotel";
    });
    const bookBtns = screen.getAllByRole("button", { name: "Book" });
    expect(bookBtns).toHaveLength(bookEvents.length);

    const viewDetailEvents = SAMPLE_RESPONSE_DATA.events.filter((event) => {
      return event.action?.type === "view_attraction";
    });
    const viewDetailBtns = screen.getAllByRole("button", { name: "View Details" });
    expect(viewDetailBtns).toHaveLength(viewDetailEvents.length);
  });

  test("View details button redirects the user to wikipedia", async () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} setPhase={() => {}} />);
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open");

    const viewDetailBtn = screen.getAllByRole("button", { name: "View Details" })[0];
    await user.click(viewDetailBtn);
    expect(open).toHaveBeenCalledWith(`https://en.wikipedia.org/wiki/en:Forbidden City`);
  });

  test("Flight details is cached for future button clicks.", async () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} setPhase={() => {}} />);
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const bookBtn = screen.getAllByRole("button", { name: "Book" })[0]; // Needs to be more specific.
    await user.click(bookBtn);

    expect(await screen.findByText("Flight Options")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close" });
    await user.click(closeBtn);
    expect(screen.queryByText("Flight Options")).not.toBeInTheDocument();

    await user.click(bookBtn);
    expect(screen.getByText("Flight Options")).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledOnce();
    // const airlineFlights = SAMPLE_FLIGHT_DETAILS.data.filter((flight)=>flight.is_airline)
    // for(const flight of airlineFlights){
    //   expect(screen.getByText(flight.title)).toBeInTheDocument();
    // }

    // expect(open).toHaveBeenCalledWith(`https://booking.com`);
  });

  test("Book hotel button opens a hotel details modal", async () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} setPhase={() => {}} />);
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const bookBtn = screen.getAllByRole("button", { name: "Book" })[1]; // Needs to be more specific.
    await user.click(bookBtn);

    expect(await screen.findByText("Hotel Details")).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_HOTEL_DETAILS_DATA.data.hotel_name)).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close" });
    await user.click(closeBtn);
    expect(screen.queryByText("Hotel Details")).not.toBeInTheDocument();

    await user.click(bookBtn);
    expect(screen.getByText("Hotel Details")).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledOnce(); // expect(open).toHaveBeenCalledWith(`https://booking.com`);
  });

  test("loads fallback UI when data is empty.", () => {
    render(<ResultPage responseData={undefined} setPhase={() => {}} />);
    expect(screen.getByText("Data missing")).toBeInTheDocument();
  });

  test("city name is rendered independently without country or regional name.", () => {
    render(
      <ResultPage
        responseData={{ ...SAMPLE_RESPONSE_DATA, startLocation: "San Francisco, California, US" }}
        setPhase={() => {}}
      />,
    );
    expect(screen.getByText("San Francisco → Beijing")).toBeInTheDocument();
    expect(screen.queryByText("San Francisco, California, US → Beijing")).not.toBeInTheDocument();
  });

  test("Shows error modal when api fetch fails", async () => {
    server.use(
      http.post("/api/hotel", () => {
        return Response.json({ message: "Bad request" }, { status: 400 });
      }),
    );

    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} setPhase={() => {}} />);
    const user = userEvent.setup();

    const bookBtn = screen.getAllByRole("button", { name: "Book" })[1]; // Needs to be more specific.
    await user.click(bookBtn);
    const errorModal = await screen.findByText("Error");
    expect(errorModal).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close" });
    await user.click(closeBtn);
    expect(errorModal).not.toBeInTheDocument();
  });

  test("Shows error modal when ref is not found in context", async () => {
    render(<ResultPage responseData={{ ...SAMPLE_RESPONSE_DATA, refs: {} }} setPhase={() => {}} />);
    const user = userEvent.setup();

    const bookBtn = screen.getAllByRole("button", { name: "Book" })[1]; // Needs to be more specific.
    await user.click(bookBtn);
    expect(screen.getByRole("heading", { name: "Error" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "We couldn't find this booking. Please try booking directly from the airline or hotel.",
      ),
    );
  });

  test("Shows error modal when ref is missing from action", async () => {
    render(
      <ResultPage
        responseData={{
          ...SAMPLE_RESPONSE_DATA,
          events: [
            {
              title: "Test Event",
              description: "",
              action: { flightRef: undefined as unknown as string, type: "book_flight" },
            },
          ],
        }}
        setPhase={() => {}}
      />,
    );
    const user = userEvent.setup();

    const bookBtn = screen.getByRole("button", { name: "Book" }); // Needs to be more specific.
    await user.click(bookBtn);
    expect(screen.getByRole("heading", { name: "Error" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "We encountered an unexpected error. Please try booking directly from the airline or hotel.",
      ),
    );
  });

  test("Cleans ref to a single ref if LLM returned multiple ref for an action. ", async () => {
    render(
      <ResultPage
        responseData={{
          ...SAMPLE_RESPONSE_DATA,
          events: [
            {
              title: "Test Event",
              description: "",
              action: { flightRef: "htl_4,flt_0", type: "book_flight" },
            },
          ],
        }}
        setPhase={() => {}}
      />,
    );
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const bookBtn = screen.getByRole("button", { name: "Book" }); // Needs to be more specific.
    await user.click(bookBtn);
    expect(screen.getByRole("heading", { name: "Flight Options" })).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify(SAMPLE_RESPONSE_DATA.refs["flt_0"]),
      }),
    );
  });
});
