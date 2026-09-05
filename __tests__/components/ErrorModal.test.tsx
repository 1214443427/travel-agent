import "@testing-library/jest-dom/vitest";
import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorModal from "@/app/components/ErrorModal";

test("error model displays the children message", () => {
  render(
    <ErrorModal>
      <p>Test</p>
    </ErrorModal>,
  );
  expect(screen.getByText("Test")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", {
      name: "Error",
    }),
  ).toBeInTheDocument();
});
