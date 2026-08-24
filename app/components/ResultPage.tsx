import React from "react";
import { EventData, ResponseData } from "../type";
import TextBox from "./TextBox";
import Button from "./Button";

function getCityName(location: string) {
  return location.split(",")[0];
}

async function actionButtonOnClick(event: EventData) {
  if (event.action!.type === "view_attraction") {
    window.open(`https://en.wikipedia.org/wiki/${event.action?.wikipedia}`);
  } else {
  }
}

function ResultPage({ responseData }: { responseData: ResponseData | undefined }) {
  if (!responseData) {
    return <div>Data missing</div>;
  }

  const startDate = new Date(responseData.startDate).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

  return (
    <div className="flex flex-col items-center text-center w-full p-4.5 overflow-scroll gap-8">
      <h1 className="text-5xl font-bold mt-6">Your Trip</h1>
      <div className="flex w-full flex-col gap-6">
        <div className="flex justify-between w-full">
          <TextBox className="w-[45%]">
            <p className="font-bold text-[20px]"> → {startDate}</p>
          </TextBox>
          <TextBox className="w-[45%]">
            <p className="font-bold text-[20px]">{startDate} ←</p>
          </TextBox>
        </div>
        <TextBox className="w-full py-3">
          <p className="font-bold text-2xl">
            {getCityName(responseData.startLocation)} → {getCityName(responseData.endLocation)}
          </p>
        </TextBox>
      </div>
      {responseData.events.map((event, index) => (
        <div className="flex flex-col gap-2" key={index}>
          <h1 className="font-bold text-2xl">{event.title}</h1>
          <TextBox className="py-4 px-3">
            <p className="text-[16px]">{event.description}</p>
            {event.action && (
              <Button onClick={() => actionButtonOnClick(event)}>
                {event.action.type === "view_attraction" ? "View Details" : "Book"}
              </Button>
            )}
          </TextBox>
        </div>
      ))}
    </div>
  );
}

export default ResultPage;
