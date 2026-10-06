import { http, HttpResponse } from "msw";
import { SAMPLE_LATLON } from "./testData/sampleLatLonData";
import { SAMPLE_WEATHER } from "./testData/sampleWeatherData";
import { SAMPLE_AIRPORT_DATA } from "./testData/sampleAirportData";
import { SAMPLE_HOTEL_DATA } from "./testData/sampleHotelData";
import { SAMPLE_ATTRACTIONS_DATA } from "./testData/sampleAttractionData";
import { SAMPLE_HOTEL_DETAILS_DATA } from "./testData/sampleHotelDetailsData";
import {
  SAMPLE_BOOK_TOKEN_FLIGHT,
  SAMPLE_BOOKING_URL,
  SAMPLE_FLIGHT_DETAILS,
  SAMPLE_NEXT_TOKEN_FLIGHT,
} from "./testData/sampleFlightDataWithNextToken";
import { FlightDetailsSchema } from "@/app/type";

export const httpHandlers = [
  //External APIs;
  http.get("https://api.openweathermap.org/geo/1.0/direct", () => {
    return HttpResponse.json(SAMPLE_LATLON);
  }),
  http.get("https://api.openweathermap.org/data/2.5/weather", () => {
    return HttpResponse.json(SAMPLE_WEATHER);
  }),
  http.get("https://google-flights2.p.rapidapi.com/api/v1/searchAirport", () => {
    return HttpResponse.json(SAMPLE_AIRPORT_DATA);
  }),
  http.get("https://google-flights2.p.rapidapi.com/api/v1/searchFlights", () => {
    return HttpResponse.json(SAMPLE_NEXT_TOKEN_FLIGHT);
  }),
  http.get("https://google-flights2.p.rapidapi.com/api/v1/getNextFlights", () => {
    return HttpResponse.json(SAMPLE_BOOK_TOKEN_FLIGHT);
  }),
  http.post("https://google-flights2.p.rapidapi.com/api/v1/getBookingURL", () => {
    return HttpResponse.json(SAMPLE_BOOKING_URL);
  }),
  http.get("https://google-flights2.p.rapidapi.com/api/v1/getBookingDetails", () => {
    return HttpResponse.json(SAMPLE_FLIGHT_DETAILS);
  }),
  http.get("https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotelsByCoordinates", () => {
    return HttpResponse.json(SAMPLE_HOTEL_DATA);
  }),
  http.get("https://booking-com15.p.rapidapi.com/api/v1/hotels/getHotelDetails", () => {
    return HttpResponse.json(SAMPLE_HOTEL_DETAILS_DATA);
  }),
  http.get("https://api.geoapify.com/v2/places", () => {
    return HttpResponse.json(SAMPLE_ATTRACTIONS_DATA);
  }),

  http.post("/api/hotel", () => {
    return HttpResponse.json({
      url: "https://www.booking.com/hotel/cn/langham-place-beijing-capital-airport.html",
      hotelName: "Cordis, Beijing Capital Airport By Langham Hospitality Group",
      address: "No.1,Yijing Road, Terminal 3, Capital Airport, Shunyi District",
      totalPrice: "US$401",
      propertyHighlight: [
        "Free parking",
        "Indoor pool",
        "Restaurant",
        "Air conditioning",
        "Private bathroom",
        "Private hot tub",
        "Bath",
        "Fitness centre",
        "Flat-screen TV",
        "Airport shuttle",
      ],
    });
  }),

  http.post("/api/flight", () => {
    return HttpResponse.json({
      data: FlightDetailsSchema.safeParse(SAMPLE_FLIGHT_DETAILS).data!.data.filter(
        (entry) => entry.is_airline === true,
      ),
    });
  }),

  http.post("/api/book", () => {
    return HttpResponse.json(SAMPLE_BOOKING_URL);
  }),
];
