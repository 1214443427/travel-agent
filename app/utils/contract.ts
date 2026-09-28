import z from "zod";
import {
  BookingApiRequestSchema,
  BookingApiResponseSchema,
  BookingHandleSchema,
  FlightDetailsSchema,
  HotelApiResponseSchema,
} from "../type";

export type Contract<Req extends z.ZodType = z.ZodType, Res extends z.ZodType = z.ZodType> = {
  requestSchema: Req;
  responseSchema: Res;
};

export const flightRouteContract = {
  requestSchema: BookingHandleSchema,
  responseSchema: FlightDetailsSchema,
} satisfies Contract;

export const bookRouteContract = {
  requestSchema: BookingApiRequestSchema,
  responseSchema: BookingApiResponseSchema,
} satisfies Contract;

export const hotelRouteContract = {
  requestSchema: BookingApiRequestSchema,
  responseSchema: HotelApiResponseSchema,
} satisfies Contract;
