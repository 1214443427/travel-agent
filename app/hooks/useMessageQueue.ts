import { useRef, useState, useEffect } from "react";

export function useMessageQueue(initial: string, delay: number) {
  const [message, setMessage] = useState<string>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function drainMessage() {
    const next = queueRef.current.shift();
    if (next === undefined) {
      timerRef.current = null;
    } else {
      setMessage(next);
      timerRef.current = setTimeout(() => drainMessage(), delay);
    }
  }

  function queueMessage(message: string) {
    queueRef.current.push(message);
    if (timerRef.current === null) {
      drainMessage();
    }
  }
  return { message, queueMessage };
}
