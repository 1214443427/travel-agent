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

export const ActivitiesSchema = z.object({
  title: z.string(),
  discretion: z.string(),
});

export const ResponseSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  startLocation: z.string(),
  endLocation: z.string(),
  activities: z.array(ActivitiesSchema),
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
