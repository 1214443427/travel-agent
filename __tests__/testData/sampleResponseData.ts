import { ModelOutput, ResponseData } from "@/app/type";
import { SAMPLE_FORM_INPUT } from "./sampleFormData";

// Sample data for testing the result page without running the agent.
export const SAMPLE_FORMATTER_OUTPUT: ModelOutput = {
  events: [
    {
      title: "Flight from Vancouver to Beijing",
      description:
        "Depart YVR and arrive at PEK on August 30, 2026. Round-trip for 2 passengers with one layover in Seoul.",
      action: { type: "book_flight", flightRef: "flt_0" },
    },
    {
      title: "Hotel in Beijing",
      description:
        "Stay at Sofitel Beijing Central from Aug 30 to Sep 18, 2026, a short walk from Wangfujing.",
      action: { type: "book_hotel", ref: "htl_4" },
    },
    {
      title: "Weather",
      description: "Expect warm, clear days at around 28 degrees for the first week of the trip.",
      action: null,
    },
    {
      title: "Visit the Forbidden City",
      description:
        "Explore one of the most iconic landmarks in Beijing. Arrive at opening to beat the crowds.",
      action: { type: "view_attraction", wikipedia: "en:Forbidden City" },
    },
    {
      title: "Visit the Great Wall of China",
      description: "One of the Seven Wonders of the World, a half day trip from central Beijing.",
      action: { type: "view_attraction", wikipedia: "en:Great Wall of China" },
    },
    {
      title: "Visit the Temple of Heaven",
      description:
        "A UNESCO World Heritage site and imperial complex of religious buildings, best in the early morning.",
      action: { type: "view_attraction", wikipedia: "en:Temple of Heaven" },
    },
  ],
};

export const SAMPLE_RESPONSE_DATA: ResponseData = {
  startDate: SAMPLE_FORM_INPUT.startDate,
  endDate: SAMPLE_FORM_INPUT.endDate,
  startLocation: SAMPLE_FORM_INPUT.from,
  endLocation: SAMPLE_FORM_INPUT.to,
  personCount: SAMPLE_FORM_INPUT.travelerCount,
  events: SAMPLE_FORMATTER_OUTPUT.events,
  refs: {
    flt_0: { kind: "booking", token: "sample_booking_token_0" },
    flt_1: { kind: "next", token: "sample_next_token_1" },
  },
};
