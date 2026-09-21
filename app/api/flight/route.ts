import { SAMPLE_FLIGHT_DETAILS } from "@/__tests__/testData/sampleFlightDataWithNextToken";
import { FlightDetailsSchema } from "@/app/type";

export async function POST(req: Request) {
  const sleep = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  await sleep();
  return new Response(JSON.stringify(FlightDetailsSchema.safeParse(SAMPLE_FLIGHT_DETAILS).data));
}
