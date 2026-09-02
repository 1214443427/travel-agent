import { FormInputData } from "@/app/type";

/**
 * FormSchema is asymmetric: `budget` is `z.string().pipe(z.coerce.number())`, so
 * the value going *in* is a string and the value coming *out* is a number. These
 * fixtures are the two sides of that boundary — SAMPLE_FORM_BODY parses into
 * SAMPLE_FORM_INPUT.
 */

/** Pre-parse. The raw JSON body a POST arrives with. Feed this to FormSchema. */
export const SAMPLE_FORM_BODY = {
  travelerCount: "2",
  from: "Vancouver",
  to: "Beijing",
  startDate: "2027-08-30",
  endDate: "2027-09-18",
  budget: "8000",
};

/** Post-parse. What planTrip() receives. Do not run this back through FormSchema. */
export const SAMPLE_FORM_INPUT: FormInputData = {
  travelerCount: 2,
  from: "Vancouver",
  to: "Beijing",
  startDate: "2027-08-30",
  endDate: "2027-09-18",
  budget: 8000,
};

const isoDaysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
};

/**
 * A pre-parse body with dates relative to today, so FormSchema's ">= today"
 * refinements never go stale. Override a field to exercise a validation branch:
 *
 *   makeFormBody({ from: "" })                    // rejects: empty origin
 *   makeFormBody({ budget: "abc" })               // rejects: non-numeric budget
 *   makeFormBody({ startDate: "2020-01-01" })     // rejects: date in the past
 */
export function makeFormBody(overrides: Record<string, unknown> = {}) {
  return {
    travelerCount: "2",
    from: "Vancouver",
    to: "Beijing",
    startDate: isoDaysFromNow(30),
    endDate: isoDaysFromNow(49),
    budget: "8000",
    ...overrides,
  };
}
