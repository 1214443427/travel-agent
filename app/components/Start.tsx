import Image from "next/image";
import Hero from "@/public/hero.png";
import React from "react";

function Start({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full justify-center">
      <Image
        src={Hero.src}
        width={Hero.width}
        height={Hero.height}
        alt="Cat wearing captain's hat is sitting next to a luggage bag."
        className="-mt-20"
      ></Image>
      {children}
    </div>
  );
}

export default Start;
