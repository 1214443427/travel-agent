"use client";
import React, {
  Dispatch,
  RefObject,
  SetStateAction,
  useActionState,
  useRef,
  useState,
} from "react";
import InputField from "./InputField";
import NumberButton from "./NumberButton";
import Button from "./Button";
import { FormSchema, FormState, ResponseData } from "../type";
import Spinner from "@/public/spinner.svg";
import Image from "next/image";
import { readEventStream } from "../utils/utils";

const toolMessageString = {
  get_lat_lon: "Finding information about the destination...",
  get_weather: "Finding weather information...",
  search_airport: "Finding the destination airport...",
  get_flights: "Finding flights for the trip...",
  get_hotels: "Finding hotels at the destination...",
  get_attractions: "Finding place to visit during the trip...",
};

const toolCompletionString = {
  get_lat_lon: "Got the destination — planning the next step...",
  get_weather: "Factoring the forecast into the plan...",
  search_airport: "Working out the route...",
  get_flights: "Comparing flight options...",
  get_hotels: "Narrowing down places to stay...",
  get_attractions: "Building your itinerary...",
};

function Form({
  setPhase,
  setResponseData,
}: {
  setPhase: Dispatch<SetStateAction<"start" | "form" | "result">>;
  setResponseData: Dispatch<SetStateAction<string | undefined>>; //change to response data later.
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(submitForm, {
    phase: "initial",
  });

  const [message, setMessage] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<string[]>([]);

  const MESSAGE_DELAY = 1000;

  function drainMessage() {
    const next = queueRef.current.shift();
    if (next === undefined) {
      timerRef.current = null;
    } else {
      setMessage(next);
      timerRef.current = setTimeout(() => drainMessage(), MESSAGE_DELAY);
    }
  }

  function queueMessage(message: string) {
    queueRef.current.push(message);
    if (timerRef.current === null) {
      drainMessage();
    }
  }

  async function submitForm(prevState: FormState, formData: FormData): Promise<FormState> {
    const formObject = Object.fromEntries(formData);
    const parsedData = FormSchema.safeParse(formObject);

    if (!parsedData.success) {
      return {
        phase: "invalid",
        error: parsedData.error,
        prevData: formData,
      };
    }

    let response: Response;
    try {
      response = await fetch("/api/trip", {
        method: "POST",
        body: JSON.stringify(parsedData.data),
      });
    } catch (error) {
      return {
        phase: "error",
        error: {
          name: "Network error",
          code: 500,
          message: error instanceof Error ? error.message : "Failed to submit form",
        },
        prevData: formData,
      };
    }
    if (!response.ok) {
      const result = await response.json();
      return {
        phase: "error",
        error: {
          name: response.statusText,
          code: response.status,
          message: result.message as string, //temp
        },
        prevData: formData,
      };
    }
    if (!response.body) {
      return {
        phase: "error",
        error: {
          name: "Internal server error",
          code: 500,
          message: "Received empty response from the server",
        },
        prevData: formData,
      };
    }
    const stream = readEventStream(response.body);

    for await (const event of stream) {
      if (event.type === "done") {
        setResponseData(event.output ?? "Error, did not receive output"); //error msg to be replaced after proper formatting
        setPhase("result");
      }

      if (event.type === "tool_finished") {
        queueMessage(
          toolCompletionString[event.tool as keyof typeof toolMessageString] ?? "Thinking...",
        );
      }

      if (event.type === "tool_started") {
        queueMessage(
          toolMessageString[event.tool as keyof typeof toolMessageString] ?? "Pondering...",
        );
      }
    }

    return prevState;
  }

  const countRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const todayString = today.toLocaleDateString("en-CA");
  const nextWeek = today.setDate(today.getDate() + 7);
  const nextWeekString = new Date(nextWeek).toLocaleDateString("en-CA");

  const buttonOnclick = (ref: RefObject<HTMLInputElement | null>, change: number) => {
    if (ref.current) {
      let newValue = Number(ref.current.value) + change;
      if (newValue < 1) newValue = 1;
      if (newValue > 10) newValue = 10;
      ref.current.value = String(newValue);
    }
  };

  const startDateOnchange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (endRef.current) {
      if (endRef.current.value < event.target.value) {
        endRef.current.value = event.target.value;
      }
      endRef.current.min = event.target.value;
    }
  };

  const prevData = "prevData" in state ? state.prevData : null;

  return (
    <div className="w-full h-full relative">
      <form action={formAction} className="flex flex-col justify-center w-full gap-2">
        <div className="flex flex-col text-center px-8 items-stretch w-full gap-2.5 mb-10">
          <label htmlFor="travelerCount" className="font-bold text-2xl">
            Number of travelers
          </label>
          <div className="flex relative items-stretch w-full">
            <NumberButton className="left-2.5" onClick={() => buttonOnclick(countRef, -1)}>
              -
            </NumberButton>
            <input
              name="travelerCount"
              type="number"
              placeholder="1"
              className="[appearance:textfield] border-4 border-black w-full rounded-full p-2 text-center font-bold text-2xl"
              defaultValue={prevData?.get("travelerCount")?.toString() || 1}
              min={1}
              max={10}
              ref={countRef}
            />
            <NumberButton className="right-2.5" onClick={() => buttonOnclick(countRef, 1)}>
              +
            </NumberButton>
          </div>
        </div>
        <InputField
          name="from"
          type="text"
          label="Traveling from"
          placeholder="New York City"
          defaultValue={prevData?.get("endDate")?.toString()}
        />
        <InputField
          name="to"
          type="text"
          label="Traveling to"
          placeholder="Paris"
          defaultValue={prevData?.get("endDate")?.toString()}
          className="mb-10"
        />
        <InputField
          name="startDate"
          type="date"
          label="From Date"
          defaultValue={prevData?.get("startDate")?.toString() || todayString}
          onChange={startDateOnchange}
          min={todayString}
        />
        <InputField
          name="endDate"
          type="date"
          label="To Date"
          defaultValue={prevData?.get("endDate")?.toString() || nextWeekString}
          ref={endRef}
          min={todayString}
          className="mb-8"
        />
        <InputField
          name="budget"
          type="number"
          label="Budget ($)"
          placeholder="5000"
          defaultValue={prevData?.get("endDate")?.toString()}
          min={0}
          className="mb-2 [appearance:textfield] relative"
        />
        <Button type="submit">Plan my Trip!</Button>
      </form>
      {isPending && (
        <div className="flex justify-center items-center z-0 bg-black/80 w-full h-full absolute top-0">
          <Image src={Spinner} alt="" width={100} />
          {message}
        </div>
      )}
    </div>
  );
}

export default Form;
