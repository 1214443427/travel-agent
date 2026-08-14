"use client";
import { useState } from "react";
import Form from "./components/Form";

export default function Home() {
  const [phase, setPhase] = useState<"start" | "form" | "result">("start");
  const [responseData, setResponseData] = useState<FormData>();
  return (
    <div className="flex w-full h-full max-w-100 bg-[#F2FFFF]">
      {phase === "start" ? (
        <div onClick={() => setPhase("form")}>Start</div>
      ) : phase === "form" ? (
        <Form />
      ) : (
        <>Result</>
      )}
    </div>
  );
}
