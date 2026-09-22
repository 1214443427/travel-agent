import { RAPID_API_KEY } from "@/app/utils/config";

export async function POST(req: Request) {
  const url = "https://google-flights2.p.rapidapi.com/api/v1/getBookingURL";

  const body = await req.json();
  const options = {
    method: "POST",
    headers: {
      "x-rapidapi-key": RAPID_API_KEY,
      "x-rapidapi-host": "google-flights2.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: body.token,
    }),
  };

  console.log(options);
  //   return new Response(
  //     JSON.stringify({
  //       data: "https://www.google.com",
  //     }),
  //   );

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result);
    return new Response(JSON.stringify(result));
  } catch (error) {
    console.error(error);
  }
}
