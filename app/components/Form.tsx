"use client";
import React, { RefObject, useActionState, useRef } from "react";
import InputField from "./InputField";
import NumberButton from "./NumberButton";
import Button from "./Button";

function Form() {
  const [state, formAction, isPending] = useActionState(
    () => {
      return { success: false };
    },
    { success: false },
  );

  const countRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const todayString = today.toLocaleDateString("en-CA");
  const nextWeek = today.setDate(today.getDate() + 7);
  const nextWeekString = new Date(nextWeek).toLocaleDateString("en-CA");

  const buttonOnclick = (ref: RefObject<HTMLInputElement | null>, change: number) => {
    if (ref.current) {
      ref.current.value = String(Number(ref.current.value) + change);
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
            defaultValue={1}
            min={1}
            max={10}
            ref={countRef}
          />
          <NumberButton className="right-2.5" onClick={() => buttonOnclick(countRef, 1)}>
            +
          </NumberButton>
        </div>
      </div>
      <InputField name="from" type="text" label="Traveling from" placeholder="New York City" />
      <InputField
        name="to"
        type="text"
        label="Traveling to"
        placeholder="Paris"
        className="mb-10"
      />
      <InputField
        name="startDate"
        type="date"
        label="From Date"
        defaultValue={todayString}
        onChange={startDateOnchange}
        min={todayString}
      />
      <InputField
        name="endDate"
        type="date"
        label="To Date"
        defaultValue={nextWeekString}
        ref={endRef}
        min={todayString}
        className="mb-8"
      />
      <InputField
        name="budget"
        type="number"
        label="Budget ($)"
        placeholder="5000"
        min={0}
        className="mb-2 [appearance:textfield] relative"
      />
      <Button type="submit">Plan my Trip!</Button>
    </form>
  );
}

export default Form;
