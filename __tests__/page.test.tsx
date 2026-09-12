import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";
import userEvent from "@testing-library/user-event";
import { fillValidForm, submitForm } from "./helper/formActions";
import createTripRouteHandler from "./helper/createTripRouteHandler";
import { SAMPLE_RESPONSE_DATA } from "./testData/sampleResponseData";

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

    expect(screen.queryByText("Trip Form")).not.toBeInTheDocument();
  });
});
