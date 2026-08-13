import React from "react";

interface Props extends React.ComponentProps<"button"> {
  children: React.ReactNode;
}

function Button({ children, ...rest }: Props) {
  return (
    <button
      className="border-4 mx-8 cursor-pointer bg-[#4BDCB0] border-black rounded-full p-2 text-center font-bold text-2xl"
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
