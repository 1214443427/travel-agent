import { SAMPLE_FLIGHT_DETAILS } from "@/__tests__/testData/sampleFlightDataWithNextToken";
import {
  APIError,
  BookingHandle,
  FetchError,
  FlightDetails,
  FlightDetailsSchema,
} from "@/app/type";
import { fetchRapidAPI } from "@/app/utils/fetching";
import { constructUrl, parseData } from "@/app/utils/utils";
import { jsonRoute } from "../jsonRoute";
import { flightRouteContract } from "@/app/utils/contract";

const handler = async (body: BookingHandle) => {
  // const sleep = () =>
  //   new Promise((resolve) => {
  //     setTimeout(resolve, 2000);
  //   });
  // await sleep();

  if (body.kind !== "booking") {
    throw new APIError(400, "Expected a booking token. Please try booking directly from airline.");
  }

  const baseURL = "https://google-flights2.p.rapidapi.com/api/v1/getBookingDetails";

  console.log(body.token);
  const options = {
    booking_token: body.token,
    currency: "USD", // TODO: Add currency to LLM response.
  };
  const url = constructUrl(baseURL, options);

  // return new Response(JSON.stringify(FlightDetailsSchema.safeParse(SAMPLE_FLIGHT_DETAILS).data));

  try {
    const result = await fetchRapidAPI(url, "google-flights2.p.rapidapi.com");
    console.log(result);
    const parsedData = parseData(FlightDetailsSchema, result);
    const airlineOffering = parsedData.data.filter((entry) => entry.is_airline === true);
    const responseBody: FlightDetails = {
      data: airlineOffering,
    };
    return responseBody;
  } catch (error) {
    console.error(error);
    if (error instanceof FetchError) {
      throw new APIError(
        error.status ?? 500,
        "We encountered an error when retrieving data from our flight information provider. Please try booking directly from the airline. ",
      );
    }
    throw new APIError(
      500,
      "We encountered an unexpected error. Please try booking directly from the airline. ",
    );
  }
};

export const POST = jsonRoute(flightRouteContract, handler);
