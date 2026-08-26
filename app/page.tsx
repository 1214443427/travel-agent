"use client";
import { useState } from "react";
import Form from "./components/Form";
import Start from "./components/Start";
import Button from "./components/Button";
import { ResponseData } from "./type";
import ResultPage from "./components/ResultPage";

// Sample data for testing the result page without running the agent.
const SAMPLE_RESPONSE_DATA: ResponseData = {
  startDate: "2026-08-30",
  endDate: "2026-09-18",
  startLocation: "Vancouver",
  endLocation: "Beijing",
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
      action: { type: "book_hotel", hotelId: 123456 },
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
  refs: {
    flt_0: { kind: "booking", token: "sample_booking_token_0" },
    flt_1: { kind: "next", token: "sample_next_token_1" },
  },
};

export default function Home() {
  const [phase, setPhase] = useState<"start" | "form" | "result">("start");
  const [responseData, setResponseData] = useState<ResponseData | undefined>();
  return (
    <div className="flex h-213 w-98 max-w-100 bg-[#F2FFFF]">
      {phase === "start" ? (
        <Start>
          <Button onClick={() => setPhase("form")} className="-mt-10">
            Let's Begin
          </Button>
        </Start>
      ) : phase === "form" ? (
        <Form setPhase={setPhase} setResponseData={setResponseData} />
      ) : (
        <ResultPage responseData={responseData}>{}</ResultPage>
      )}
    </div>
  );
}
