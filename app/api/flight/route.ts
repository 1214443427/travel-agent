import { SAMPLE_FLIGHT_DETAILS } from "@/__tests__/testData/sampleFlightDataWithNextToken";
import { BookingHandleSchema, FetchError, FlightDetails, FlightDetailsSchema } from "@/app/type";
import { fetchRapidAPI } from "@/app/utils/fetching";
import { constructUrl, parseData } from "@/app/utils/utils";

export async function POST(req: Request) {
  // const sleep = () =>
  //   new Promise((resolve) => {
  //     setTimeout(resolve, 2000);
  //   });
  // await sleep();

  const body = await req.json();
  const parsedData = BookingHandleSchema.safeParse(body);
  if (!parsedData.success) {
    return Response.json(
      {
        statusText: "Bad request",
        message: "The request is malformed.",
      },
      { status: 400 },
    );
  }

  if (parsedData.data.kind !== "booking") {
    return Response.json(
      {
        statusText: "Bad request",
        message: "Expected a booking token.",
      },
      { status: 400 },
    );
  }

  const baseURL = "https://google-flights2.p.rapidapi.com/api/v1/getBookingDetails";

  console.log(parsedData.data.token);
  const options = {
    booking_token: parsedData.data.token,
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
    return new Response(JSON.stringify(responseBody));
  } catch (error) {
    console.error(error);
    if (error instanceof FetchError) {
      return Response.json(
        {
          message:
            "We encountered an error when retrieving data from our flight information provider. Please try booking directly from the airline. ",
        },
        { status: error.status ?? 400 },
      );
    }
  }
}
