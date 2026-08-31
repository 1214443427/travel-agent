import * as z from "zod";

export const FormSchema = z
  .object({
    travelerCount: z.coerce.number().min(1).max(10),
    from: z.string().nonempty("Please state your origin location. "),
    to: z.string().nonempty("Please state your desired destination. "),
    startDate: z.iso
      .date("Please set a date in mm/dd/yyyy format. ")
      .refine(
        (date) => date >= new Date().toLocaleDateString("en-CA"),
        "Start date must be greater or equal to today",
      ),
    endDate: z.iso
      .date("Please set a date in mm/dd/yyyy format. ")
      .refine(
        (date) => date >= new Date().toLocaleDateString("en-CA"),
        "End date must be greater or equal to today",
      ),
    budget: z
      .string()
      .min(1, "Please set a positive number as budget.")
      .pipe(z.coerce.number("Must be a number")),
  })
  .refine((data) => data.endDate >= data.startDate, "End date must be greater than start date");

export type FormInputData = z.infer<typeof FormSchema>;

const FlightAction = z.object({
  type: z.literal("book_flight"),
  flightRef: z
    .string()
    .describe("The `ref` value shown on the chosen flight option in context, e.g. 'flt_3'."),
});

const HotelAction = z.object({
  type: z.literal("book_hotel"),
  hotelId: z.number().describe("The `hotelId` of the chosen property."),
});

const AttractionAction = z.object({
  type: z.literal("view_attraction"),
  wikipedia: z
    .string()
    .describe("Verbatim `wikipedia` field from get_attractions, e.g. 'en:Foley Square'."),
});

export const EventSchema = z.object({
  title: z.string().describe("The name of the event. E.g. Weather, Flights, Hotel, etc"),
  description: z
    .string()
    .describe(
      "An one sentence description of the event. This will be shown to the user, keep the content concise and easy to read. Do not include any action data such as URL link to wikipedia in here. For example: 'The best option for you is with Delta Airlines with a layover in Oslo.', 'Visit the Temple of Heaven early, then head to the Summer Palace once the crowds pick up.'",
    ),
  action: z
    .discriminatedUnion("type", [FlightAction, HotelAction, AttractionAction])
    .describe("Only include for flights, hotel stays, and tourist attractions.")
    .nullable(),
});

export type EventData = z.infer<typeof EventSchema>;

const BookingHandleSchema = z.object({
  kind: z.enum(["next", "booking"]),
  token: z.string(),
});
export type BookingHandle = z.infer<typeof BookingHandleSchema>;
// { kind: "next" | "booking"; token: string };

const TravelAgentContextSchema = z.object({ refs: z.map(z.string(), BookingHandleSchema) });
export type TravelAgentContext = z.infer<typeof TravelAgentContextSchema>;
// { refs: Map<string, BookingHandle> };

const RefsWireSchema = z.record(z.string(), BookingHandleSchema);

export const ResponseSchema = z.object({
  startDate: z.string().describe("Should match the ones given in the prompt."),
  endDate: z.string().describe("Should match the ones given in the prompt."),
  startLocation: z.string().describe("Should match the ones given in the prompt."),
  endLocation: z.string().describe("Should match the ones given in the prompt."),
  events: z
    .array(EventSchema)
    .describe(
      "An array of cards to render. Including weather, transit, hotel stay, activities for the user, etc.",
    ),
  refs: RefsWireSchema,
});

export type ResponseData = z.infer<typeof ResponseSchema>;

export const ModelOutputSchema = ResponseSchema.omit({ refs: true });
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

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
      prevData?: FormData;
    }
  | {
      phase: "invalid";
      error: z.ZodError<FormInputData>;
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

export const LatLonSchema = z.array(
  z.object({
    name: z.string(),
    lat: z.number(),
    lon: z.number(),
    country: z.string(),
    state: z.string().nullish(),
  }),
);

export const WeatherSchema = z.object({
  weather: z
    .array(
      z.object({
        main: z.string(),
        description: z.string(),
      }),
    )
    .min(1),
  main: z.object({
    temp: z.number(),
  }),
});

export const AirportSchema = z.object({
  data: z.array(
    z.object({
      title: z.string(),
      city: z.string(),
      list: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          title: z.string(),
          city: z.string(),
        }),
      ),
    }),
  ),
});

const FlightSegmentAirportSchema = z.object({
  airport_name: z.string(),
  airport_code: z.string(),
  time: z.string(),
});

export const FlightSchema = z.object({
  data: z.object({
    itineraries: z.object({
      topFlights: z.array(
        z.object({
          departure_time: z.string(),
          arrival_time: z.string(),
          duration: z.object({ raw: z.number(), text: z.string() }),
          price: z.number(),
          flights: z.array(
            z.object({
              departure_airport: FlightSegmentAirportSchema,
              arrival_airport: FlightSegmentAirportSchema,
              duration: z.object({ raw: z.number(), text: z.string() }),
            }),
          ),
          layovers: z
            .array(
              z.object({
                airport_code: z.string(),
                airport_name: z.string(),
                duration: z.number(),
              }),
            )
            .nullable(),
          booking_token: z.string().nullish(),
          next_token: z.string().nullish(),
        }),
      ),
    }),
  }),
});

const HotelTimeSchema = z.object({
  from: z.string(),
  until: z.string(),
});

const HotelSchema = z.object({
  hotel_id: z.number(),
  hotel_name: z.string(),
  review_score: z.number().nullish(),
  review_nr: z.number().nullish(),
  checkout: HotelTimeSchema,
  checkin: HotelTimeSchema,
  hotel_name_trans: z.string().nullish(),
  composite_price_breakdown: z.object({
    all_inclusive_amount: z.object({ currency: z.string(), value: z.number() }),
  }),
  class: z.number(),
});

export const HotelsSchema = z.object({
  data: z.object({
    result: z.array(HotelSchema).transform((array) => array.filter((element) => element !== null)),
    // Catching error to avoid a single bad object ruining the whole array. Converts elements that did not fit the hotel schema into null filter the array to remove null
  }),
});

export const PlacesSchema = z.object({
  features: z
    .array(
      z
        .object({
          properties: z.object({
            name: z.string(),
            name_international: z.object({ en: z.string().nullish() }).nullish(),
            website: z.string().nullish(),
            opening_hours: z.string().nullish(),
            categories: z.array(z.string()),
            descriptions: z.string().nullish(),
            wiki_and_media: z
              .object({
                wikipedia: z.string().nullish(),
              })
              .nullish(),
          }),
        })
        .nullable()
        .catch(null),
    )
    .transform((array) => array.filter((element) => element !== null)),
});

export const TripStreamSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("tool_started"), tool: z.string() }),
  z.object({ type: z.literal("tool_finished"), tool: z.string() }),
  z.object({ type: z.literal("done"), output: ResponseSchema }),
  z.object({ type: z.literal("error"), code: z.number().nullish(), message: z.string() }),
]);

export type TripStream = z.infer<typeof TripStreamSchema>;

export type ErrorMessages = { credentials: string; retryable: string; generic: string };
