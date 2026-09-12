import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import RootLayout, { metadata } from "@/app/layout";

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "mock-inter", variable: "mock-inter-variable" }),
}));
describe("Layout", () => {
  test("renders children correctly", () => {
    const children = <h1>Children</h1>;
    render(<RootLayout params={Promise.resolve({})}>{children}</RootLayout>);
    expect(screen.getByRole("heading", { name: "Children" })).toBeInTheDocument();
  });

  test("sets the document attributes.", () => {
    render(<RootLayout params={Promise.resolve({})}> Children </RootLayout>);
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(document.documentElement).toHaveClass("mock-inter-variable");
  });

  test("sets the metadata", () => {
    expect(metadata).toEqual({
      title: "Travel Planner",
      description: "AI powered trip planner. ",
    });
  });
});
