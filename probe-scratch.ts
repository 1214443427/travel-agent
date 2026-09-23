import { jsonRoute } from "./app/api/jsonRoute";
import { flightRouteContract, bookRouteContract } from "./app/utils/contract";

// @ts-expect-error returning the bare array instead of { data: [...] } must fail
export const A = jsonRoute(flightRouteContract, async () => []);

// @ts-expect-error wrong response shape must fail
export const B = jsonRoute(bookRouteContract, async () => ({ url: "https://x.com" }));

// request data must be narrowed to the contract's request type
export const C = jsonRoute(bookRouteContract, async (data) => {
  const t: string = data.token;
  // @ts-expect-error `kind` is not on the book request schema
  console.log(data.kind);
  return { data: t };
});
