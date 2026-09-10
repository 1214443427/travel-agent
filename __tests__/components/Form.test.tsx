import "@testing-library/jest-dom/vitest";
import { expect, test, describe, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { UserEvent, userEvent } from "@testing-library/user-event";
import Form, {
  genericString,
  toolCompletionString,
  toolMessageString,
} from "@/app/components/Form";
import { SAMPLE_RESPONSE_DATA } from "../testData/sampleResponseData";
import { afterEach } from "vitest";
import { MESSAGE_DELAY } from "@/app/utils/const";
import createTripRouteHandler from "../helper/createTripRouteHandler";
import { server } from "../test-setup";
import { http, HttpResponse } from "msw";
import { ResponseData } from "@/app/type";

vi.mock("@/app/utils/const", () => {
  return {
    MESSAGE_DELAY: 250,
  };
});

const today = new Date();
const todayString = today.toLocaleDateString("en-CA");
const nextWeek = today.setDate(today.getDate() + 7);
const nextWeekString = new Date(nextWeek).toLocaleDateString("en-CA");
const generateOffsetDateString = (offset: number) => {
  const newDate = new Date();
  return new Date(newDate.setDate(newDate.getDate() + offset)).toLocaleDateString("en-CA");
};

const FIELDS = [
  {
    label: "Number of travelers",
    name: "travelerCount",
    type: "text",
    value: "1",
    placeholder: "1",
    testValue: "2",
    invalidValue: "12",
  },
  {
    label: "Traveling from",
    name: "from",
    type: "text",
    value: "",
    placeholder: "New York City",
    testValue: "Vancouver",
    invalidValue: "",
  },
  {
    label: "Traveling to",
    name: "to",
    type: "text",
    value: "",
    placeholder: "Paris",
    testValue: "Beijing",
    invalidValue: "",
  },
  {
    label: "From Date",
    name: "startDate",
    type: "date",
    value: todayString,
    placeholder: "",
    testValue: generateOffsetDateString(3),
    invalidValue: "September 8th 2026",
  },
  {
    label: "To Date",
    name: "endDate",
    type: "date",
    value: nextWeekString,
    placeholder: "",
    testValue: generateOffsetDateString(13),
    invalidValue: "September 1th 2026",
  },
  {
    label: "Budget ($)",
    name: "budget",
    type: "number",
    value: "",
    placeholder: "5000",
    testValue: "7000",
    invalidValue: "-1000",
  },
];

function setUpForm() {
  const setPhase = vi.fn();
  const setResponseData = vi.fn();
  render(<Form setPhase={setPhase} setResponseData={setResponseData} />);
  return { setPhase, setResponseData };
}

async function fillInput({
  user,
  input,
  type,
  value,
}: {
  user: UserEvent;
  input: HTMLInputElement;
  type: string;
  value: any;
}) {
  await user.clear(input);
  if (!value) {
    return;
  }
  if (type !== "date") {
    await user.type(input, value);
  } else {
    fireEvent.change(input, { target: { value: value } });
  }
}

async function fillValidForm(user: UserEvent) {
  for (const field of FIELDS) {
    const input = screen.getByLabelText(field.label) as HTMLInputElement;
    await fillInput({ user, input, type: field.type, value: field.testValue });
  }
}

async function fillFormFireEvent() {
  for (const field of FIELDS) {
    const input = screen.getByLabelText(field.label) as HTMLInputElement;
    fireEvent.change(input, { target: { value: field.testValue } });
  }
}

async function submitForm(user: UserEvent) {
  const submitBtn = screen.getByRole("button", { name: "Plan my Trip!" });
  await user.click(submitBtn);
}

function submitFormFireEvent() {
  const form = screen.getByRole("form");
  fireEvent.submit(form);
}

function seeText(text: string | RegExp) {
  return vi.waitFor(() => {
    const element = screen.getByTestId("loadingMessage");
    return expect(element).toHaveTextContent(text);
  });
}

test("uses the overridden constant", () => {
  expect(MESSAGE_DELAY).toBe(250);
});

describe("Form", () => {
  test("traveler count input works as expected.", async () => {
    setUpForm();
    const user = userEvent.setup();
    expect(screen.getByText("Number of travelers")).toBeInTheDocument();
    const travelerInput = screen.getByRole("spinbutton", {
      name: "Number of travelers",
    }) as HTMLInputElement;
    expect(travelerInput.value).toBe("1");
    await user.clear(travelerInput);
    await user.type(travelerInput, "3");
    expect(travelerInput.value).toBe("3");
  });

  test("traveler count increment / decrement buttons work.", async () => {
    setUpForm();
    const user = userEvent.setup();
    const travelerInput = screen.getByRole("spinbutton", {
      name: "Number of travelers",
    }) as HTMLInputElement;
    const decrementBtn = screen.getByRole("button", { name: "-" });
    const incrementBtn = screen.getByRole("button", { name: "+" });
    expect(travelerInput.value).toBe("1");
    await user.click(incrementBtn);
    expect(travelerInput.value).toBe("2");
    await user.click(decrementBtn);
    expect(travelerInput.value).toBe("1");
    await user.click(decrementBtn);
    expect(travelerInput.value, "the button respects the minimum restriction of 1. ").toBe("1");
    for (let i = 0; i <= 20; i++) {
      await user.click(incrementBtn);
    }
    expect(travelerInput.value, "the button respects the maximum restriction of 10. ").toBe("10");
  });

  describe("renders working InputField components.", async () => {
    test.each(FIELDS.slice(1))("$label input field works as expected", async (field) => {
      setUpForm();
      const user = userEvent.setup();
      const input = screen.getByLabelText(field.label) as HTMLInputElement;
      expect(input.defaultValue).toBe(field.value);
      expect(input.placeholder).toBe(field.placeholder);
      await fillInput({ user, input, type: field.type, value: field.testValue });
      expect(input.value).toEqual(field.testValue);
    });
  });

  describe("submission works as expected.", () => {
    test("successful submit calls the expected callback function.", async () => {
      const { setPhase, setResponseData } = setUpForm();
      const user = userEvent.setup();
      const { send, close } = createTripRouteHandler();
      await fillValidForm(user);
      await submitForm(user);
      await send({ type: "done", output: SAMPLE_RESPONSE_DATA });
      expect(screen.getByText("Thinking about what to do first...")).toBeInTheDocument();
      await close();
      await waitFor(() => {
        expect(setPhase).toHaveBeenCalledWith("result");
        expect(setResponseData).toHaveBeenCalledWith(SAMPLE_RESPONSE_DATA);
      });
    });

    test("rejects improper formatted data.", async () => {
      const { setPhase, setResponseData } = setUpForm();
      const user = userEvent.setup();
      for (const field of FIELDS) {
        const input = screen.getByLabelText(field.label) as HTMLInputElement;
        await fillInput({
          user,
          input,
          type: field.type,
          value: field.invalidValue,
        });
      }
      const submitBtn = screen.getByRole("button", { name: "Plan my Trip!" });
      await user.click(submitBtn);
      expect(setPhase).not.toHaveBeenCalled();
      expect(setResponseData).not.toHaveBeenCalled();
      expect(
        (screen.getByLabelText("Number of travelers") as HTMLInputElement).validationMessage,
      ).not.toBe("");
    });
  });

  describe("Loading messages", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllMocks();
    });

    test("should be rendered in order.", async () => {
      setUpForm();
      const { ready, send, close } = createTripRouteHandler();
      fillFormFireEvent();
      submitFormFireEvent();

      await seeText("Thinking about what to do first...");
      // await ready;
      await send({ type: "tool_started", tool: "get_weather" });
      await send({ type: "tool_started", tool: "get_flights" });
      await send({ type: "tool_finished", tool: "get_weather" });

      await seeText(toolMessageString.get_weather);
      await seeText(toolMessageString.get_flights);
      await seeText(toolCompletionString.get_weather);
      await close();
    });

    test("shows fallback generic message for unrecognized tool.", async () => {
      setUpForm();
      const { ready, send, close } = createTripRouteHandler();
      fillFormFireEvent();
      submitFormFireEvent();

      await seeText("Thinking about what to do first...");

      await send({ type: "tool_started", tool: "not_a_known_tool" });
      await seeText(new RegExp(`^(${genericString.join("|")})$`));
      await send({ type: "tool_finished", tool: "not_a_known_tool" });
      vi.advanceTimersByTime(200);
      await seeText(new RegExp(`^(${genericString.join("|")})$`));

      await close();
    });
  });

  describe("InputField behavior", () => {
    test("shows validation message upon failed submission.", async () => {
      setUpForm();
      const user = userEvent.setup();
      for (const field of FIELDS) {
        const input = screen.getByLabelText(field.label) as HTMLInputElement;
        await fillInput({
          user,
          input,
          type: field.type,
          value: field.invalidValue,
        });
      }
      submitFormFireEvent();
      expect(await screen.findByText("Too big: expected number to be <=10")).toBeInTheDocument();
      expect(screen.getByText("Please state your origin location.")).toBeInTheDocument();
      expect(screen.getByText("Please state your desired destination.")).toBeInTheDocument();
      expect(screen.getAllByText("Please set a date in mm/dd/yyyy format.").length).toBe(2);
      expect(screen.getByText("Please set a positive number as budget.")).toBeInTheDocument();
    });

    test("date selector rejects impossible time frames", async () => {
      setUpForm();
      const startInput = screen.getByLabelText("From Date");
      const toInput = screen.getByLabelText("To Date");
      fireEvent.change(startInput, { target: { value: "2025-09-01" } });
      fireEvent.change(toInput, { target: { value: "2025-09-01" } });
      const form = screen.getByRole("form", { name: "Trip Form" }) as HTMLFormElement;
      fireEvent.submit(form);
      expect(
        await screen.findByText("Start date must be greater or equal to today"),
      ).toBeInTheDocument();
      expect(screen.getByText("End date must be greater or equal to today")).toBeInTheDocument();
      fireEvent.change(startInput, { target: { value: nextWeekString } });
      fireEvent.change(toInput, { target: { value: todayString } });
      fireEvent.submit(form);
      expect(
        await screen.findByText("End date must be greater than start date"),
      ).toBeInTheDocument();
    });

    test("filled inputs are recovered after failed submission", async () => {
      setUpForm();
      const user = userEvent.setup();
      const form = screen.getByRole("form", { name: "Trip Form" }) as HTMLFormElement;
      for (const field of FIELDS) {
        const input = screen.getByLabelText(field.label) as HTMLInputElement;
        await fillInput({
          user,
          input,
          type: field.type,
          value: field.invalidValue,
        });
        input.blur(); // react-dom skips defaultValue for focused element. Need to blur to restore all values.
      }
      fireEvent.submit(form);
      await waitForElementToBeRemoved(() => screen.getByText("Thinking about what to do first..."));
      for (const field of FIELDS) {
        const input = screen.getByLabelText(field.label) as HTMLInputElement;
        if (field.type != "date") {
          expect(input.value).toBe(field.invalidValue);
        }
      }
    });

    test("invalid messages disappear after editing.", async () => {
      setUpForm();
      const user = userEvent.setup();
      const input = screen.getByLabelText("Number of travelers") as HTMLInputElement;
      await user.type(input, "2");
      submitFormFireEvent();
      expect(await screen.findByText("Too big: expected number to be <=10")).toBeInTheDocument();
      expect(screen.getByText("Please state your origin location.")).toBeInTheDocument();
      await user.clear(input);
      expect(screen.queryByRole("Too big: expected number to be <=10")).not.toBeInTheDocument();
      expect(
        screen.getByText("Please state your origin location."),
        "invalid messages should remain on unedited field.",
      );
    });
  });

  describe("handles error gracefully", () => {
    test("handles server sent error correctly.", async () => {
      const { setPhase } = setUpForm();
      const user = userEvent.setup();
      const { send, close } = createTripRouteHandler();
      await fillValidForm(user);
      await submitForm(user);

      await send({ type: "error", code: 500, message: "Internal Server Error" });
      expect(await screen.findByText("Internal Server Error")).toBeInTheDocument();
      expect(screen.getByText("Server Error")).toBeInTheDocument();
      await close();
      expect(setPhase).not.toHaveBeenCalled();
    });

    test("shows error modal on server sent error events.", async () => {
      const { setPhase } = setUpForm();
      const user = userEvent.setup();
      const { send, close } = createTripRouteHandler();
      await fillValidForm(user);
      await submitForm(user);

      await send({ type: "error", code: 500, message: "Internal Server Error" });
      await close();
      expect(await screen.findByText("Internal Server Error")).toBeInTheDocument();
      expect(screen.getByText("Server Error")).toBeInTheDocument();
      expect(setPhase).not.toHaveBeenCalled();
    });

    test("dismisses error modal on button click.", async () => {
      setUpForm();
      const user = userEvent.setup();
      const { send, close } = createTripRouteHandler();
      await fillValidForm(user);
      await submitForm(user);

      await send({ type: "error", code: 500, message: "Internal Server Error" });
      await close();
      const modalText = await screen.findByText("Internal Server Error");

      expect(modalText).toBeInTheDocument();
      const backBtn = screen.getByRole("button", { name: "Back to form" });
      await user.click(backBtn);
      expect(modalText).not.toBeInTheDocument();
    });

    test("shows error modal on stream error", async () => {
      setUpForm();
      const user = userEvent.setup();
      const { error } = createTripRouteHandler();
      await fillValidForm(user);
      await submitForm(user);

      await error("Unexpected Error");
      expect(await screen.findByText("Connection lost")).toBeInTheDocument();
    });

    test("shows error modal on server error", async () => {
      setUpForm();
      const user = userEvent.setup();
      server.use(
        http.post("/api/trip", () => {
          return HttpResponse.json(
            { statusText: "Bad request", message: "The request is malformed." },
            { status: 400 },
          );
        }),
      );
      await fillValidForm(user);
      await submitForm(user);

      expect(await screen.findByText("Bad request")).toBeInTheDocument();
    });

    test("shows error modal on when stream end before 'done'. ", async () => {
      setUpForm();
      const user = userEvent.setup();
      const { ready, close } = createTripRouteHandler();
      await fillValidForm(user);
      await submitForm(user);

      await ready;
      await close();
      expect(await screen.findByText("Incomplete response")).toBeInTheDocument();
      expect(
        screen.getByText("The server stopped responding before finishing. Please try again."),
      ).toBeInTheDocument();
    });

    test("handles empty response", async () => {
      setUpForm();
      const user = userEvent.setup();
      server.use(
        http.post("/api/trip", () => {
          return new HttpResponse(null, {
            headers: {
              "Content-Type": "text/event-stream",
            },
          });
        }),
      );
      await fillValidForm(user);
      await submitForm(user);

      expect(await screen.findByText("Internal server error")).toBeInTheDocument();
      expect(screen.getByText("Received empty response from the server")).toBeInTheDocument();
    });

    test("handles malformed response", async () => {
      setUpForm();
      const user = userEvent.setup();
      const { ready, send, close } = createTripRouteHandler();
      await fillValidForm(user);
      await submitForm(user);

      await send({
        type: "done",
        output: {
          ...SAMPLE_RESPONSE_DATA,
          endLocation: null,
          startDate: null,
        } as unknown as ResponseData,
      });
      expect(screen.getByText("Thinking about what to do first...")).toBeInTheDocument();
      await close();
      expect(await screen.findByText("Server Error")).toBeInTheDocument();
      expect(screen.getByText("Server sent malformed data.")).toBeInTheDocument();
    });

    test("handles fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
      vi.spyOn(console, "error").mockImplementation(() => {}); //keep test output clean

      setUpForm();
      const user = userEvent.setup();
      await fillValidForm(user);
      await submitForm(user);

      expect(screen.getByText("Network error")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
    });
  });
});
