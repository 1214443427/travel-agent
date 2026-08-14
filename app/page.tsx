"use client";
import { useState } from "react";
import Form from "./components/Form";
import Start from "./components/Start";
import Button from "./components/Button";

export default function Home() {
  const [phase, setPhase] = useState<"start" | "form" | "result">("start");
  const [responseData, setResponseData] = useState<FormData>();
  return (
    <div className="flex h-213 w-98 max-w-100 bg-[#F2FFFF]">
      {phase === "start" ? (
        <Start>
          <Button onClick={() => setPhase("form")} className="-mt-10">
            Let's Begin
          </Button>
        </Start>
      ) : phase === "form" ? (
        <Form />
      ) : (
        <>Result</>
      )}
    </div>
  );
}
