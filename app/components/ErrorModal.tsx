import React from "react";
import { combineClassName } from "../utils/utils";

function ErrorModal({ children, className }: { children: React.ReactNode; className: string }) {
  let combinedClass = combineClassName(
    "absolute flex flex-col justify-center p-3 left-1/2 top-1/2 -translate-1/2 w-3/5 gap-2 bg-white border-4 border-[#4BDCB0] rounded-3xl",
    className,
  );
  return (
    <div className={combinedClass}>
      <h1 className="text-2xl font-bold text-center">Error</h1>
      {children}
    </div>
  );
}

export default ErrorModal;
