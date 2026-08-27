import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

test("Page", () => {
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
