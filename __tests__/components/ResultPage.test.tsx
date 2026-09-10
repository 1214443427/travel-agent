import ResultPage from "@/app/components/ResultPage";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi } from "vitest";
import { SAMPLE_RESPONSE_DATA } from "../testData/sampleResponseData";
import userEvent from "@testing-library/user-event";

describe("ResultPage", () => {
  test("renders the title", () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} />);
    expect(screen.getByRole("heading", { name: "Your Trip" })).toBeInTheDocument();
  });

  test("renders the duration and location of the travel", () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} />);
    expect(screen.getByText("→ Aug 30, 26")).toBeInTheDocument();
    expect(screen.getByText("Sep 18, 26 ←")).toBeInTheDocument();
    expect(screen.getByText("Vancouver → Beijing")).toBeInTheDocument();
  });

  test("renders events with heading and description", () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} />);
    for (const event of SAMPLE_RESPONSE_DATA.events) {
      expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
      expect(screen.getByText(event.description)).toBeInTheDocument();
    }
  });

  test("renders activation buttons for the events", () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} />);
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
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} />);
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open");

    const viewDetailBtn = screen.getAllByRole("button", { name: "View Details" })[0];
    await user.click(viewDetailBtn);
    expect(open).toHaveBeenCalledWith(`https://en.wikipedia.org/wiki/en:Forbidden City`);
  });

  test("Book button redirects the user to booking.com", async () => {
    render(<ResultPage responseData={SAMPLE_RESPONSE_DATA} />);
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open");

    const bookBtn = screen.getAllByRole("button", { name: "Book" })[0];
    await user.click(bookBtn);
    expect(open).toHaveBeenCalledWith(`https://booking.com`);
  });

  test("loads fallback UI when data is empty.", () => {
    render(<ResultPage responseData={undefined} />);
    expect(screen.getByText("Data missing")).toBeInTheDocument();
  });
});
