"use client";
import { useState } from "react";
import Form from "./components/Form";
import Start from "./components/Start";
import Button from "./components/Button";
import { ResponseData } from "./type";
import ResultPage from "./components/ResultPage";
import { SAMPLE_RESPONSE_DATA } from "@/__tests__/testData/sampleResponseData";

export default function Home() {
  const [phase, setPhase] = useState<"start" | "form" | "result">("result");
  const [responseData, setResponseData] = useState<ResponseData | undefined>(SAMPLE_RESPONSE_DATA);
  return (
    <div className="flex h-213 w-98 max-w-100 bg-[#F2FFFF]">
      {phase === "start" ? (
        <Start>
          <Button onClick={() => setPhase("form")} className="-mt-10">
            {"Let\'s Begin"}
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
