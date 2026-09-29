import { hotelRouteContract } from "@/app/utils/contract";
import { jsonRoute } from "../jsonRoute";
import {
  APIError,
  FetchError,
  HotelApiRequest,
  type HotelDetails,
  HotelDetailsSchema,
} from "@/app/type";
import { fetchRapidAPI } from "@/app/utils/fetching";
import { constructUrl, parseData } from "@/app/utils/utils";
import { SAMPLE_HOTEL_DETAILS_DATA } from "@/__tests__/testData/sampleHotelDetailsData";

async function handler({ token, arrivalDate, departureDate, adults }: HotelApiRequest) {
  const baseURL = "https://booking-com15.p.rapidapi.com/api/v1/hotels/getHotelDetails";
  const options = {
    hotel_id: token,
    adults,
    arrival_date: arrivalDate,
    departure_date: departureDate,
  };
  const fullUrl = constructUrl(baseURL, options);
  try {
    const result = fetchRapidAPI(fullUrl, "booking-com15.p.rapidapi.com");
    // const result = SAMPLE_HOTEL_DETAILS_DATA;
    const parsedData = parseData(HotelDetailsSchema, result).data;

    const hotelUrl = parsedData.url;
    const options = {
      checkin: arrivalDate,
      checkout: departureDate,
      group_adults: adults,
      no_rooms: 1,
    };
    const hotelFullUrl = constructUrl(hotelUrl, options);

    const flattenedData: HotelDetails = {
      url: hotelFullUrl.toString(),
      hotelName: parsedData.hotel_name,
      address: parsedData.address,
      totalPrice: parsedData.composite_price_breakdown.all_inclusive_amount.amount_rounded,
      propertyHighlight: parsedData.property_highlight_strip.map((highlight) => highlight.name),
    };
    return flattenedData;
  } catch (error) {
    console.log(error);
    if (error instanceof FetchError) {
      throw new APIError(
        error.status ?? 500,
        "We encountered an error when retrieving data from our hotel information provider. Please try manually look up the hotel.",
      );
    }
    throw new APIError(
      500,
      "We encountered an unexpected error. Please try manually look up the hotel.",
    );
  }
}

export const POST = jsonRoute(hotelRouteContract, handler);
