import { APIError, BookingApiRequestSchema, BookingApiType } from "@/app/type";
import { RAPID_API_KEY } from "@/app/utils/config";
import { jsonRoute } from "../jsonRoute";
import { bookRouteContract } from "@/app/utils/contract";
import { parseData } from "@/app/utils/utils";

export const POST = jsonRoute(bookRouteContract, async (data) => {
  const url = "https://google-flights2.p.rapidapi.com/api/v1/getBookingURL";

  const options = {
    method: "POST",
    headers: {
      "x-rapidapi-key": RAPID_API_KEY,
      "x-rapidapi-host": "google-flights2.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: data.token,
    }),
  };

  console.log(options);
  //   return new Response(
  //     JSON.stringify({
  //       data: "https://www.google.com",
  //     }),
  //   );
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    console.error(error);
    throw new APIError(
      500,
      "Failed to fetch booking URL. Please try booking directly from the airline. ",
    );
  }
  if (!response.ok) {
    throw new APIError(
      502,
      "Failed to fetch booking URL. Please try booking directly from the airline. ",
    );
  }
  let parsedData;
  try {
    const result = await response.json();
    parsedData = parseData(bookRouteContract.responseSchema, result);
  } catch (error) {
    console.error(error);
    throw new APIError(
      502,
      "We encountered an error when retrieving data from our flight information provider. Please try booking directly from the airline.",
    );
  }
  console.log(parsedData);
  return parsedData;
});
