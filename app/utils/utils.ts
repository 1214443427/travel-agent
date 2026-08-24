import z from "zod";
import { TripStreamSchema } from "../type";

export function combineClassName(baseClass: string, externalClassName?: string) {
  if (externalClassName) {
    return baseClass + " " + externalClassName;
  } else {
    return baseClass;
  }
}

type QueryOptions = Record<string, string | number | boolean | undefined>;

export function constructUrl(base: string, options: QueryOptions) {
  const endpoint = new URL(base);

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      endpoint.searchParams.set(key, String(value));
    }
  });

  return endpoint;
}

export function parseData<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(z.prettifyError(result.error));
    throw new Error("The end point returned data with unexpected format. ");
  }
  return result.data;
}

export async function* readEventStream(responseBody: ReadableStream<Uint8Array<ArrayBuffer>>) {
  let decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of responseBody) {
    const data = decoder.decode(chunk);
    buffer += data;
    let split: number;
    while ((split = buffer.indexOf("\n\n")) !== -1) {
      let parsedEvent;
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      try {
        const payload = frame.slice(5).trim();
        const eventJson = JSON.parse(payload);
        parsedEvent = TripStreamSchema.safeParse(eventJson);
      } catch {
        break;
      }
      if (!parsedEvent.success) {
        console.log("received invalid stream event", parsedEvent.error);
      } else {
        console.log(parsedEvent.data);
        yield parsedEvent.data;
      }
    }
  }
}

export function randomInt(max: number) {
  return Math.floor(Math.random() * (max + 1));
}
