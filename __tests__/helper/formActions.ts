import { fireEvent, screen } from "@testing-library/react";
import { UserEvent } from "@testing-library/user-event";

const today = new Date();
export const todayString = today.toLocaleDateString("en-CA");
const nextWeek = today.setDate(today.getDate() + 7);
export const nextWeekString = new Date(nextWeek).toLocaleDateString("en-CA");

const generateOffsetDateString = (offset: number) => {
  const newDate = new Date();
  return new Date(newDate.setDate(newDate.getDate() + offset)).toLocaleDateString("en-CA");
};

export const FIELDS = [
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

export async function fillInput({
  user,
  input,
  type,
  value,
}: {
  user: UserEvent;
  input: HTMLInputElement;
  type: string;
  value: string;
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

export async function fillValidForm(user: UserEvent) {
  for (const field of FIELDS) {
    const input = screen.getByLabelText(field.label) as HTMLInputElement;
    await fillInput({ user, input, type: field.type, value: field.testValue });
  }
}

export function fillFormFireEvent() {
  for (const field of FIELDS) {
    const input = screen.getByLabelText(field.label) as HTMLInputElement;
    fireEvent.change(input, { target: { value: field.testValue } });
  }
}

export async function submitForm(user: UserEvent) {
  const submitBtn = screen.getByRole("button", { name: "Plan my Trip!" });
  await user.click(submitBtn);
}

export function submitFormFireEvent() {
  const form = screen.getByRole("form");
  fireEvent.submit(form);
}
