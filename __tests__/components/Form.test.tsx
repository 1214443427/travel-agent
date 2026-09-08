import "@testing-library/jest-dom/vitest";
import { expect, test, describe, vi } from "vitest";
import {
  cleanup,
  findByText,
  fireEvent,
  getByRole,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { UserEvent, userEvent } from "@testing-library/user-event";
import Form from "@/app/components/Form";
import { http, HttpResponse } from "msw";
import { SAMPLE_RESPONSE_DATA } from "../testData/sampleResponseData";
import { server } from "../test-setup";

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

const frame = (data: any) => `data:${JSON.stringify(data)} \n\n`;

function createRouteHandler(data: string) {
  let release!: () => void;
  let gate = new Promise<void>((resolve) => (release = resolve));

  server.use(
    http.post("/api/trip", () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(data));
          await gate;
          controller.close();
        },
      });
      return new HttpResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "X-Content-Type-Options": "nosniff",
          Connection: "keep-alive",
        },
      });
    }),
  );

  return release;
}

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
      const release = createRouteHandler(frame({ type: "done", output: SAMPLE_RESPONSE_DATA }));
      for (const field of FIELDS) {
        const input = screen.getByLabelText(field.label) as HTMLInputElement;
        await fillInput({ user, input, type: field.type, value: field.testValue });
      }
      const submitBtn = screen.getByRole("button", { name: "Plan my Trip!" });
      await user.click(submitBtn);
      expect(screen.getByText("Thinking about what to do first...")).toBeInTheDocument();
      release();
      expect(setPhase).toHaveBeenCalledWith("result");
      expect(setResponseData).toHaveBeenCalledWith(SAMPLE_RESPONSE_DATA);
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

    test("shows validation message upon failed submission.", async () => {
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
      const form = screen.getByRole("form", { name: "Trip Form" }) as HTMLFormElement;
      fireEvent.submit(form);
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
      const form = screen.getByRole("form", { name: "Trip Form" }) as HTMLFormElement;
      fireEvent.change(startInput, { target: { value: "2025-09-01" } });
      fireEvent.change(toInput, { target: { value: "2025-09-01" } });
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
  });
});
