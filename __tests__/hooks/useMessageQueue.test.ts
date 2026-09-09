import { toolMessageString } from "@/app/components/Form";
import { useMessageQueue } from "@/app/hooks/useMessageQueue";
import { act, renderHook } from "@testing-library/react";
import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";

describe("useMessageQueue hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  test("The initial message match the passed parameter.", () => {
    const { result } = renderHook(() => useMessageQueue("test", 200));
    expect(result.current.message).toBe("test"); //Do not deconstruct current. The data will be stale.
  });
  test("The message last at least a delay before exiting.", () => {
    const { result } = renderHook(() => useMessageQueue("test", 200));
    const { queueMessage } = result.current;
    act(() => queueMessage(toolMessageString.get_weather));
    act(() => queueMessage(toolMessageString.get_flights));
    act(() => queueMessage(toolMessageString.get_hotels));
    expect(result.current.message, "the first message should appear immediately").toBe(
      toolMessageString.get_weather,
    );
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.message).toBe(toolMessageString.get_flights);
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current.message).toBe(toolMessageString.get_flights);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.message).toBe(toolMessageString.get_hotels);
  });

  test("Removes the timeout after unmount", () => {
    const { result, unmount } = renderHook(() => useMessageQueue("test", 200));
    act(() => {
      result.current.queueMessage("abc");
    });
    act(() => {
      result.current.queueMessage("abc");
    });
    act(() => {
      result.current.queueMessage("abc");
    });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
