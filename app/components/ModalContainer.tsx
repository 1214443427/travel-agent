import React, { ReactNode } from "react";

function ModalContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center items-center z-0 bg-black/80 w-full h-full absolute top-0 flex-col">
      {children}
    </div>
  );
}

export default ModalContainer;
