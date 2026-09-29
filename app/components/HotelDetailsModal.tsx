import React from "react";
import ModalContainer from "./ModalContainer";
import { HotelDetails } from "../type";
import Button from "./Button";

function HotelDetailsModal({
  hotelDetails,
  closeModal,
}: {
  hotelDetails: HotelDetails;
  closeModal: () => void;
}) {
  return (
    <div className="absolute flex flex-col justify-center p-3 left-1/2 top-1/2 -translate-1/2 w-80 gap-2 bg-white border-4 border-[#4BDCB0] rounded-3xl">
      <h1 className="font-bold text-2xl border-b-2 border-[#09ac7b]">Hotel Details</h1>
      <section className="">
        <h3 className="font-bold">Name</h3>
        {hotelDetails.hotelName}
      </section>
      <section className="border-y-2 py-2 border-[#09ac7b]">
        <h3 className="font-bold">Amenities</h3>
        <ul className="grid grid-cols-2">
          {hotelDetails.propertyHighlight.map((highlight, index) => (
            <li key={index} className="text-left">
              ✅{highlight}
            </li>
          ))}
        </ul>
      </section>
      <div className="flex">
        <Button onClick={() => window.open(hotelDetails.url)}>Book</Button>
        <Button className="bg-red-400" onClick={closeModal}>
          Close
        </Button>
      </div>
    </div>
  );
}

export default HotelDetailsModal;
