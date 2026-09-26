import React, { startTransition, useActionState, useState } from "react";
import { FlightDetails } from "../type";
import ModalContainer from "./ModalContainer";
import TextBox from "./TextBox";
import Button from "./Button";
import LoadingMessage from "./LoadingMessage";
import { fetchInternalAPI } from "../utils/clientFetching";
import { bookRouteContract } from "../utils/contract";
import ErrorModal from "./ErrorModal";

function DetailsModal({
  flightDetails,
  closeModal,
  isPending,
}: {
  flightDetails: FlightDetails;
  closeModal: () => void;
  isPending: boolean;
}) {
  const [error, setError] = useState<string>("");

  const [bookMap, bookAction, bookPending] = useActionState(
    async (prevState: Map<string, string>, token: string) => {
      const response = await fetchInternalAPI("/api/book", bookRouteContract, {
        token: token,
      });
      if (!response.ok) {
        setError(response.message);
        return prevState;
      }
      const nextMap = new Map(prevState);
      nextMap.set(token, response.data.data);
      window.open(response.data.data, "_blank");
      return nextMap;
    },
    new Map(),
  );

  function bookingOnClick(token: string) {
    if (bookMap.has(token)) {
      window.open(bookMap.get(token));
    } else {
      startTransition(() => {
        bookAction(token);
      });
    }
  }

  return (
    <div className="flex flex-col w-80 h-213 overflow-scroll items-center gap-6">
      <h1 className="border-2 w-4/5 text-2xl font-bold bg-white border-[#4BDCB0] rounded-3xl">
        Options
      </h1>

      {isPending ? (
        <ModalContainer>
          <LoadingMessage message="Loading..." />
        </ModalContainer>
      ) : (
        <div className="flex flex-col w-4/5 gap-4">
          {flightDetails.data.map((option, index) => (
            <TextBox key={index} className="flex flex-col items-center bg-green-100 gap-1 px-3">
              <h1 className="capitalize bg-white py-0.5 px-3 rounded-2xl text-xl font-medium">
                {(option.cabin ?? "basic").toLocaleLowerCase()}
              </h1>
              <ul>
                {option.meta
                  ? option.meta.features.map((feature, index) => (
                      <li key={index} className="text-left">
                        ➡️ {feature}
                      </li>
                    ))
                  : "Visit the website for more information."}
              </ul>
              <Button onClick={() => bookingOnClick(option.token)}>${option.price}</Button>
            </TextBox>
          ))}
        </div>
      )}
      <Button
        className="border-2 p-2 capitalize text-2xl cursor-pointer hover:bg-red-100 font-bold bg-white border-red-600 rounded-full"
        onClick={closeModal}
      >
        close
      </Button>

      {bookPending && (
        <ModalContainer>
          <LoadingMessage message="Loading..."></LoadingMessage>
        </ModalContainer>
      )}

      {error && (
        <ErrorModal className="w-50">
          {" "}
          <p>{error}</p>
          <Button onClick={() => setError("")}>Close</Button>
        </ErrorModal>
      )}
    </div>
  );
}

export default DetailsModal;
