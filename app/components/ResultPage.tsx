import React, { Dispatch, SetStateAction, startTransition, useActionState, useState } from "react";
import {
  BookingHandle,
  BookingStates,
  EventData,
  FlightDetails,
  FlightDetailsSchema,
  ResponseData,
} from "../type";
import TextBox from "./TextBox";
import Button from "./Button";
import FlightDetailsModal from "./FlightDetailsModal";
import ModalContainer from "./ModalContainer";
import LoadingMessage from "./LoadingMessage";
import ErrorModal from "./ErrorModal";
import { ApiResult, fetchInternalAPI } from "../utils/clientFetching";
import { Contract, flightRouteContract, hotelRouteContract } from "../utils/contract";
import HotelDetailsModal from "./HotelDetailsModal";

function getCityName(location: string) {
  return location.split(",")[0];
}

function toBookingState<T>(
  result: ApiResult<T>,
  onSuccess: (data: T) => BookingStates,
): BookingStates {
  if (!result.ok) {
    return {
      state: "error",
      message: result.message,
    };
  }
  return onSuccess(result.data);
}

function ResultPage({
  responseData,
  setPhase,
}: {
  responseData: ResponseData | undefined;
  setPhase: Dispatch<SetStateAction<"form" | "start" | "result">>;
}) {
  // const [flightDetails, setFlightDetails] = useState<FlightDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  async function bookingButtonAction(
    prevState: BookingStates,
    ref: string | null,
  ): Promise<BookingStates> {
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
          "We encountered an unexpected error. Please try booking directly from the airline or hotel.",
      };
    }

    // If LLM returned more than one ref, attempt to recover the last one.
    const cleanedRef = ref.split(",").at(-1)?.trim() ?? ref;
    const handle = responseData?.refs[cleanedRef];
    if (!handle)
      return {
        state: "error",
        message:
          "We couldn't find this booking. Please try booking directly from the airline or hotel.",
      };

    let apiResult;
    if (handle.kind === "hotel") {
      apiResult = await fetchInternalAPI("/api/hotel", hotelRouteContract, {
        token: handle.token,
        adults: handle.adults,
        arrivalDate: handle.checkIn,
        departureDate: handle.checkOut,
      });
      return toBookingState(apiResult, (data) => ({ state: "hotel", data }));
    } else {
      apiResult = await fetchInternalAPI("/api/flight", flightRouteContract, handle);
      return toBookingState(apiResult, (data) => ({ state: "flight", data }));
    }

    // return handle.kind === "hotel"
    //   ? {
    //       state: "hotel",
    //       data: apiResult,
    //     }
    //   : {
    //       state: "flight",
    //       data: apiResult.data,
    //     };
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
      if (bookingState.state === "hotel") {
        return setIsModalOpen(true);
      }
      const ref = event.action.ref;
      setIsModalOpen(true);
      startTransition(() => {
        bookingAction(ref);
      });
    } else if (event.action.type === "book_flight") {
      if (bookingState.state === "flight") {
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
          {isPending || bookingState.state == "init" ? (
            <LoadingMessage message="Loading..." />
          ) : bookingState.state == "flight" ? (
            <FlightDetailsModal
              flightDetails={bookingState.data}
              closeModal={() => {
                setIsModalOpen(false);
              }}
              isPending={isPending}
            ></FlightDetailsModal>
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
            <HotelDetailsModal
              hotelDetails={bookingState.data}
              closeModal={() => {
                setIsModalOpen(false);
              }}
            />
          )}
        </ModalContainer>
      )}

      <Button className="bg-amber-200" onClick={() => setPhase("start")}>
        Plan Another Trip
      </Button>
    </div>
  );
}

export default ResultPage;
