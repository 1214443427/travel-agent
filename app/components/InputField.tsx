import React from "react";
import { combineClassName } from "../utils/utils";

interface Props extends React.ComponentProps<"input"> {
  label: string;
  invalid?: boolean;
  invalidMessage?: string;
}

function InputField({ label, className, invalid, invalidMessage, ...rest }: Props) {
  let inputStyling = "border-4 border-black grow-1 rounded-full p-2 text-center font-bold text-2xl";
  inputStyling = combineClassName(inputStyling, className);
  return (
    <div className="flex flex-col text-center px-8 items-stretch w-full gap-2.5">
      <label htmlFor={rest.name} className="font-bold text-2xl">
        {label}
      </label>
      <input
        id={rest.name}
        {...rest}
        className={inputStyling}
        // required
      ></input>
      {invalid && <p className="text-red-600 -mt-2">{invalidMessage}</p>}
    </div>
  );
}

export default InputField;
