import HotelDetailsModal from "@/app/components/HotelDetailsModal";
import { HotelDetails } from "@/app/type";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

const testHotel: HotelDetails = {
  address: "123 Document.St Arstotzka",
  hotelName: "Arstotzka National Hotel",
  propertyHighlight: ["Free Wi-Fi", "Free Parking"],
  totalPrice: "20 Rupee",
  url: "https://www.google.com",
};

describe("Hotel Modal", () => {
  test("renders as expected", () => {
    const onClose = vi.fn();
    render(<HotelDetailsModal hotelDetails={testHotel} closeModal={onClose} />);

    expect(screen.getByRole("heading", { name: "Hotel Details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByText("Arstotzka National Hotel")).toBeInTheDocument();

    const list = screen.getByRole("list");
    expect(within(list).getByText(/Free Wi-Fi/)).toBeInTheDocument();
    expect(within(list).getByText(/Free Parking/)).toBeInTheDocument();
  });

  test("user interactions work as expected", async () => {
    const onClose = vi.fn();
    const openSpy = vi.spyOn(window, "open");
    render(<HotelDetailsModal hotelDetails={testHotel} closeModal={onClose} />);
    const user = userEvent.setup();

    const bookBtn = screen.getByRole("button", { name: "Book" });
    await user.click(bookBtn);
    expect(openSpy).toHaveBeenCalledExactlyOnceWith(testHotel.url);

    const closeBtn = screen.getByRole("button", { name: "Close" });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
