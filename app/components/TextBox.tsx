import React, { ReactNode } from "react";
import { combineClassName } from "../utils/utils";

function TextBox({ children, className }: { children: ReactNode; className?: string }) {
  const combinedClassName = combineClassName(
    "bg-[#BBF7F7] py-1.5 shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] rounded-[20px]",
    className,
  );
  return <div className={combinedClassName}>{children}</div>;
}

export default TextBox;
