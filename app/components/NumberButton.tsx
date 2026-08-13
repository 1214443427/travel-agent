import { ComponentProps } from "react";
import { combineClassName } from "../utils/utils";

function NumberButton({ children, className, ...rest }: ComponentProps<"button">) {
  const baseStyle =
    "absolute bg-black rounded-full aspect-1 h-8 w-8 text-white font-bold top-1/2 -translate-y-1/2 cursor-pointer text-3xl inline-flex justify-center items-center";
  const combinedStyle = combineClassName(baseStyle, className);

  return (
    <button type="button" {...rest} className={combinedStyle}>
      {children}
    </button>
  );
}

export default NumberButton;
