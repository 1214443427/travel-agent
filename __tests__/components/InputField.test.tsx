import "@testing-library/jest-dom/vitest";
import { expect, test, describe } from "vitest";
import { render, screen } from "@testing-library/react";
import InputField from "@/app/components/InputField";

describe("InputField", () => {
  test("displays label and input field correctly", () => {
    render(<InputField label="city name" name="city" />);
    expect(screen.getByText("city name")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "city name",
      }),
    ).toBeInTheDocument();
  });

  test("displays invalid message when input is invalid", () => {
    render(
      <InputField
        label="city name"
        name="city"
        invalid={true}
        invalidMessage="Please enter your planned destination."
      />,
    );
    expect(screen.getByText("Please enter your planned destination.")).toBeInTheDocument();
  });

  test("does not display invalid message when input is valid", () => {
    render(
      <InputField
        label="city name"
        name="city"
        invalid={false}
        invalidMessage="Potential stale invalid message"
      />,
    );
    expect(screen.queryByText("Potential stale invalid message")).not.toBeInTheDocument();
  });
});
