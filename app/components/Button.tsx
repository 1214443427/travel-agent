import React from "react";
import { combineClassName } from "../utils/utils";

interface Props extends React.ComponentProps<"button"> {
  children: React.ReactNode;
}

function Button({ children, className, ...rest }: Props) {
  const combinedClassName = combineClassName(
    "border-4 mx-8 cursor-pointer bg-[#4BDCB0] border-black rounded-full p-2 text-center font-bold text-2xl",
    className,
  );
  return (
    <button className={combinedClassName} {...rest}>
      {children}
    </button>
  );
}

export default Button;
