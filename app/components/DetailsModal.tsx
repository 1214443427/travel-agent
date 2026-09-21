import React from "react";
import { FlightDetails } from "../type";
import ModalContainer from "./ModalContainer";
import TextBox from "./TextBox";
import Button from "./Button";
import LoadingMessage from "./LoadingMessage";

function DetailsModal({
  flightDetails,
  closeModal,
  isPending,
}: {
  flightDetails: FlightDetails;
  closeModal: () => void;
  isPending: boolean;
}) {
  function bookingOnClick() {}

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
                {option.cabin.toLocaleLowerCase()}
              </h1>
              <ul>
                {option.meta.features.map((feature, index) => (
                  <li key={index} className="text-left">
                    ➡️ {feature}
                  </li>
                ))}
              </ul>
              <Button>${option.price}</Button>
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
    </div>
  );
}

export default DetailsModal;
