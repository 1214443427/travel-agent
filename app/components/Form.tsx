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
import { readEventStream, randomInt } from "../utils/utils";
import ErrorModal from "./ErrorModal";
import z from "zod";
import { MESSAGE_DELAY } from "../utils/const";
import { useMessageQueue } from "../hooks/useMessageQueue";
import ModalContainer from "./ModalContainer";
import LoadingMessage from "./LoadingMessage";

export const toolMessageString = {
  get_lat_lon: "Finding information about the destination...",
  get_weather: "Finding weather information...",
  search_airport: "Finding the destination airport...",
  get_flights: "Finding flights for the trip...",
  get_hotels: "Finding hotels at the destination...",
  get_attractions: "Finding place to visit during the trip...",
  format_itinerary: "Adding the finishing touch...",
};

export const toolCompletionString = {
  get_lat_lon: "Got the destination — planning the next step...",
  get_weather: "Factoring the forecast into the plan...",
  search_airport: "Working out the route...",
  get_flights: "Comparing flight options...",
  get_hotels: "Narrowing down places to stay...",
  get_attractions: "Building your itinerary...",
  format_itinerary: "All finished!",
};

export const genericString = [
  "Making sense of what we found...",
  "Weighing the options...",
  "Putting the pieces together...",
];

function Form({
  setPhase,
  setResponseData,
}: {
  setPhase: Dispatch<SetStateAction<"start" | "form" | "result">>;
  setResponseData: Dispatch<SetStateAction<ResponseData | undefined>>; //change to response data later.
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(submitForm, {
    phase: "initial",
  });

  const { message, queueMessage } = useMessageQueue(
    "Thinking about what to do first...",
    MESSAGE_DELAY,
  );
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  async function submitForm(prevState: FormState, formData: FormData): Promise<FormState> {
    if (prevState.phase === "error") {
      return {
        phase: "initial",
        prevData: formData,
      };
    }

    const formObject = Object.fromEntries(formData);
    const parsedData = FormSchema.safeParse(formObject);

    setEditedFields(new Set());

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
        body: JSON.stringify(formObject), //sending the raw object so the budget stays as string. (to preserve coerce)
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
      let result;
      try {
        result = await response.json();
      } catch {
        return {
          phase: "error",
          error: {
            name: response.statusText,
            code: response.status,
            message: response.statusText,
          },
          prevData: formData,
        };
      }
      return {
        phase: "error",
        error: {
          name: (result.statusText as string) ?? "Request failed",
          code: response.status,
          message: (result.message as string) ?? "Something went wrong",
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

    try {
      for await (const event of stream) {
        if (event.type === "error") {
          return {
            phase: "error",
            error: {
              name: "Server Error",
              code: 500,
              message: event.message,
            },
            prevData: formData,
          };
        }

        if (event.type === "done") {
          // const parsedResult = ResponseSchema.safeParse(event.output);
          setResponseData(event.output);
          setPhase("result");
          return {
            phase: "initial",
          };
        }

        if (event.type === "tool_finished") {
          queueMessage(
            toolCompletionString[event.tool as keyof typeof toolCompletionString] ??
              genericString[randomInt(3)],
          );
          continue;
        }

        if (event.type === "tool_started") {
          queueMessage(
            toolMessageString[event.tool as keyof typeof toolMessageString] ??
              genericString[randomInt(3)],
          );
          continue;
        }
      }
    } catch {
      return {
        phase: "error",
        error: {
          name: "Connection lost",
          code: 500,
          message: "The connection to the server was interrupted. Please try again.",
        },
        prevData: formData,
      };
    }

    return {
      phase: "error",
      error: {
        name: "Incomplete response",
        code: 500,
        message: "The server stopped responding before finishing. Please try again.",
      },
      prevData: formData,
    };
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
      endRef.current.min = event.target.value || todayString;
    }
  };

  const handleEdit = (event: React.ChangeEvent<HTMLFormElement>) => {
    const name = event.target.name;
    if (!editedFields.has(name)) {
      setEditedFields((prev) => new Set(prev).add(name));
    }
  };

  const prevData = "prevData" in state ? state.prevData : null;
  const fieldErrors = state.phase === "invalid" ? z.flattenError(state.error).fieldErrors : {};

  const isInvalid = (name: string) => {
    return fieldErrors.hasOwnProperty(name) && !editedFields.has(name);
  };

  // const invalidMessage = state.phase === "invalid" ? state.error.issues[0].message : "";

  return (
    <div className="w-full h-full relative">
      <form
        name="tripForm"
        aria-label="Trip Form"
        action={formAction}
        onChange={handleEdit}
        className="flex flex-col justify-center w-full gap-2"
      >
        <div className="flex flex-col text-center px-8 items-stretch w-full gap-2.5 mb-2">
          <label htmlFor="travelerCount" className="font-bold text-2xl">
            Number of travelers
          </label>
          <div className="flex relative items-stretch w-full">
            <NumberButton className="left-2.5" onClick={() => buttonOnclick(countRef, -1)}>
              -
            </NumberButton>
            <input
              id="travelerCount"
              name="travelerCount"
              type="number"
              placeholder="1"
              className="[appearance:textfield] border-4 border-black w-full rounded-full p-2 text-center font-bold text-2xl"
              defaultValue={prevData?.get("travelerCount")?.toString() || 1}
              min={1}
              max={10}
              ref={countRef}
              required
              aria-invalid={isInvalid("travelerCount")}
              aria-describedby="travelerCount-error-message"
            />
            <NumberButton className="right-2.5" onClick={() => buttonOnclick(countRef, 1)}>
              +
            </NumberButton>
          </div>
          {isInvalid("travelerCount") && (
            <p className="text-red-600 -mt-2" id="travelerCount-error-message">
              {fieldErrors.travelerCount?.[0]}
            </p>
          )}
        </div>
        <InputField
          name="from"
          type="text"
          label="Traveling from"
          placeholder="New York City"
          defaultValue={prevData?.get("from")?.toString()}
          invalid={isInvalid("from")}
          invalidMessage={fieldErrors.from?.[0]}
        />
        <InputField
          name="to"
          type="text"
          label="Traveling to"
          placeholder="Paris"
          defaultValue={prevData?.get("to")?.toString()}
          className="mb-1"
          invalid={isInvalid("to")}
          invalidMessage={fieldErrors.to?.[0]}
        />
        <InputField
          name="startDate"
          type="date"
          label="From Date"
          defaultValue={prevData?.get("startDate")?.toString() || todayString}
          onChange={startDateOnchange}
          min={todayString}
          invalid={isInvalid("startDate")}
          invalidMessage={fieldErrors.startDate?.[0]}
        />
        <InputField
          name="endDate"
          type="date"
          label="To Date"
          defaultValue={prevData?.get("endDate")?.toString() || nextWeekString}
          ref={endRef}
          // min={todayString}
          invalid={isInvalid("endDate")}
          invalidMessage={fieldErrors.endDate?.[0]}
        />
        <InputField
          name="budget"
          type="number"
          label="Budget ($)"
          placeholder="5000"
          defaultValue={prevData?.get("budget")?.toString()}
          min={1}
          className="mb-2 [appearance:textfield]"
          invalid={isInvalid("budget")}
          invalidMessage={fieldErrors.budget?.[0]}
        />
        <Button type="submit">Plan my Trip!</Button>
        {(isPending || state.phase === "error") && (
          <ModalContainer>
            {isPending ? (
              <LoadingMessage message={message} />
            ) : (
              state.phase === "error" && (
                <ErrorModal>
                  <p>{state.error.name}</p>
                  <p>{state.error.code}</p>
                  <p>{state.error.message}</p>
                  <Button type="submit" disabled={isPending}>
                    Back to form
                  </Button>
                </ErrorModal>
              )
            )}
          </ModalContainer>
        )}
      </form>
    </div>
  );
}

export default Form;
