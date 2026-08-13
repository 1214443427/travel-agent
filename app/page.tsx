"use client";
import { useState } from "react";
import Form from "./components/Form";

export default function Home() {
  const [phase, setPhase] = useState<"start" | "form" | "result">("start");
  return <div className="flex w-full h-full max-w-100 bg-[#F2FFFF]">{<Form />}</div>;
}
