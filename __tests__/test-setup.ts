import { afterAll, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { httpHandlers } from "./httpHandlers";
import { http, HttpResponse } from "msw";

// Clean up the DOM after each test
afterEach(() => {
  cleanup();
});

export const server = setupServer(...httpHandlers);

server.listen({
  onUnhandledRequest(request, print) {
    const { hostname } = new URL(request.url);
    if (hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1") return;
    print.error();
  },
});

afterEach(() => {
  server.resetHandlers();
  vi.resetAllMocks();
});

afterAll(() => server.close());
