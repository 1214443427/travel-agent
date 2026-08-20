import * as z from "zod";

export const FormSchema = z
  .object({
    travelerCount: z.coerce.number().min(1).max(10),
    from: z.string(),
    to: z.string(),
    startDate: z.iso
      .date()
      .refine(
        (date) => date >= new Date().toLocaleDateString("en-CA"),
        "Start date must be greater or equal to today",
      ),
    endDate: z.iso
      .date()
      .refine(
        (date) => date >= new Date().toLocaleDateString("en-CA"),
        "End date must be greater or equal to today",
      ),
    budget: z.coerce.number().min(0),
  })
  .refine((data) => data.endDate >= data.startDate, "End date must be greater than start date");

export type FormInputData = z.infer<typeof FormSchema>;

export const EventsSchema = z.object({
  title: z.string().describe("The name of the event. E.g. Weather, Flights, Hotel, etc"),
  description: z
    .string()
    .describe(
      "A short description of the event. E.g. The best option for you is with Delta Airlines with a layover in Oslo.",
    ),
});

export const ResponseSchema = z.object({
  startDate: z.string().describe("Should match the ones given in the prompt."),
  endDate: z.string().describe("Should match the ones given in the prompt."),
  startLocation: z.string().describe("Should match the ones given in the prompt."),
  endLocation: z.string().describe("Should match the ones given in the prompt."),
  events: z
    .array(EventsSchema)
    .describe("An array of events. Including transit, hotel stay, activities for the user, etc."),
});

export class APIError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super();
    this.code = code;
    this.message = message;
  }
}

export type FormState =
  | {
      phase: "initial";
    }
  | {
      phase: "invalid";
      error: z.ZodError;
      prevData: FormData;
    }
  | {
      phase: "error";
      error: APIError;
      prevData: FormData;
    };

export class FetchError extends Error {
  status: number | null;
  url: string;
  constructor(status: number | null, message: string, url: string, cause?: unknown) {
    super(message, { cause });
    this.status = status;
    this.url = url;
  }

  get retryable() {
    return this.status === null || this.status === 429 || this.status >= 500;
  }
}

// export const LatLonSchema = ;
