import React, { startTransition, useActionState, useState } from "react";
import {
  BookingStates,
  EventData,
  FlightDetails,
  FlightDetailsSchema,
  ResponseData,
} from "../type";
import TextBox from "./TextBox";
import Button from "./Button";
import DetailsModal from "./DetailsModal";
import ModalContainer from "./ModalContainer";
import LoadingMessage from "./LoadingMessage";
import ErrorModal from "./ErrorModal";

function getCityName(location: string) {
  return location.split(",")[0];
}

function ResultPage({ responseData }: { responseData: ResponseData | undefined }) {
  // const [flightDetails, setFlightDetails] = useState<FlightDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  async function bookingButtonAction(
    prevState: BookingStates,
    ref: string | null,
  ): Promise<BookingStates> {
    console.log("ref", ref);

    if (prevState.state === "error") {
      setIsModalOpen(false);
      return {
        state: "init",
      };
    }

    if (!ref) {
      return {
        state: "error",
        message:
          "We encountered an unexpected error. Please try booking directly from the airline. ",
      };
    }

    let cleanedRef;
    if (ref.split(",").length > 1) {
      cleanedRef = ref[1];
    } else {
      cleanedRef = ref;
    }
    let response: Response;
    try {
      response = await fetch("/api/flight", {
        method: "POST",
        body: JSON.stringify(responseData!.refs[cleanedRef]),
      });
    } catch {
      return {
        state: "error",
        message: "Failed to connect to the server. Please try again later.",
      };
    }
    let data;
    try {
      data = await response.json();
    } catch {
      return {
        state: "error",
        message: "We encountered an issue with the server.",
      };
    }
    if (!response.ok) {
      return {
        state: "error",
        message: data.message,
      };
    }
    const parsedData = FlightDetailsSchema.safeParse(data);
    if (!parsedData.success) {
      console.log(parsedData.error);
      console.log(response);
      return {
        state: "error",
        message: "We encountered an issue with the server.",
      };
    }
    return {
      state: "success",
      data: parsedData.data,
    };
  }

  const [bookingState, bookingAction, isPending] = useActionState<BookingStates, string | null>(
    bookingButtonAction,
    {
      state: "init",
    },
  );

  function bookingOnClick(event: EventData) {
    if (!event.action) return;
    if (event.action.type === "view_attraction") {
      window.open(`https://en.wikipedia.org/wiki/${event.action?.wikipedia}`);
    } else if (event.action.type === "book_hotel") {
      window.open("https://booking.com"); //todo: implement real booking api.
    } else if (event.action.type === "book_flight") {
      if (bookingState.state === "success") {
        return setIsModalOpen(true);
      }
      const ref = event.action.flightRef;
      setIsModalOpen(true);
      startTransition(() => {
        bookingAction(ref);
      });
    }
  }

  if (!responseData) {
    return <div>Data missing</div>;
  }

  const startDate = new Date(responseData.startDate).toLocaleDateString("en-US", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

  const endDate = new Date(responseData.endDate).toLocaleDateString("en-US", {
    timeZone: "UTC",
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
            <p className="font-bold text-[20px]">→ {startDate}</p>
          </TextBox>
          <TextBox className="w-[45%]">
            <p className="font-bold text-[20px]">{endDate} ←</p>
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
              <Button onClick={() => bookingOnClick(event)}>
                {event.action.type === "view_attraction" ? "View Details" : "Book"}
              </Button>
            )}
          </TextBox>
        </div>
      ))}
      {(isPending || isModalOpen) && (
        <ModalContainer>
          {bookingState.state == "success" ? (
            <DetailsModal
              flightDetails={bookingState.data}
              closeModal={() => {
                setIsModalOpen(false);
              }}
              isPending={isPending}
            ></DetailsModal>
          ) : bookingState.state == "error" ? (
            <ErrorModal className="w-60">
              {bookingState.message}
              <Button
                onClick={() => {
                  startTransition(() => bookingAction(null));
                }}
              >
                Close
              </Button>
            </ErrorModal>
          ) : (
            <LoadingMessage message="Loading..." />
          )}
        </ModalContainer>
      )}
    </div>
  );
}

export default ResultPage;
