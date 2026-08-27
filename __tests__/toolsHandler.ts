import { http, HttpResponse } from "msw";
import { SAMPLE_LATLON } from "./testData/sampleLatLonData";
import { SAMPLE_WEATHER } from "./testData/sampleWeatherData";
import { SAMPLE_AIRPORT_DATA } from "./testData/sampleAirportData";
import { SAMPLE_FLIGHT_DATA } from "./testData/sampleFlightData";

export const httpHandlers = [
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
    return HttpResponse.json(SAMPLE_FLIGHT_DATA);
  }),
];
