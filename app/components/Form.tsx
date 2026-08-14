"use client";
import React, { RefObject, useActionState, useRef } from "react";
import InputField from "./InputField";
import NumberButton from "./NumberButton";
import Button from "./Button";
import { FormState } from "../type";

function Form() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(submitForm, {
    phase: "initial",
  });

  async function submitForm(prevState: FormState, formData: FormData): Promise<FormState> {
    try {
      const response = await fetch("/api/trip", {
        method: "POST",
      });
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
    } catch (error) {
      console.log(error);
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
        // type="date"
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
  );
}

export default Form;
