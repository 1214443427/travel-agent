"use client";
import { useState } from "react";
import Form from "./components/Form";
import Start from "./components/Start";
import Button from "./components/Button";
import { ResponseData } from "./type";
import ResultPage from "./components/ResultPage";

// Sample data for testing the result page without running the agent.
const SAMPLE_RESPONSE_DATA: ResponseData = {
  startDate: "2026-09-12",
  endDate: "2026-09-19",
  startLocation: "Vancouver, Canada",
  endLocation: "Beijing, China",
  events: [
    {
      title: "Weather",
      description:
        "You can expect the weather to be quite mild. Low will be 19° and high will be 25°.",
      action: null,
    },
    {
      title: "Flights",
      description:
        "The best option for you is with Air Canada, leaving Vancouver at 1:40 PM and landing in Beijing the following afternoon.",
      action: "book",
    },
    {
      title: "Hotel",
      description:
        "You will be staying seven nights at the Novotel Beijing Peace Hotel, a ten minute walk from Wangfujing Street.",
      action: null,
    },
    {
      title: "Day 1 — Forbidden City",
      description:
        "Spend the morning walking through the Forbidden City and finish the afternoon in Jingshan Park.",
      action: null,
    },
    {
      title: "Day 2 — Great Wall",
      description:
        "Take a day trip out to the Mutianyu section of the Great Wall, which is far quieter than Badaling.",
      action: null,
    },
    {
      title: "Day 3 — Temple of Heaven",
      description:
        "Visit the Temple of Heaven early, then head to the Summer Palace once the crowds pick up.",
      action: "view",
      wikipedia: "en:Temple of Heaven",
    },
    {
      title: "Food",
      description:
        "Book a table at Siji Minfu for Peking duck, and try the breakfast stalls around Nanluoguxiang.",
      action: null,
    },
    {
      title: "Return flight",
      description:
        "Your return flight leaves Beijing at 4:15 PM and arrives back in Vancouver the same morning.",
      action: null,
    },
  ],
};

export default function Home() {
  const [phase, setPhase] = useState<"start" | "form" | "result">("result");
  const [responseData, setResponseData] = useState<ResponseData | undefined>(SAMPLE_RESPONSE_DATA);
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
