import z from "zod";
import { Contract } from "./contract";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function fetchInternalAPI<Req extends z.ZodType, Res extends z.ZodType>(
  path: string,
  contract: Contract<Req, Res>,
  body: z.infer<Req>,
): Promise<ApiResult<z.infer<Res>>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      message: "Failed to connect to the server. Please try again later.",
    };
  }
  let data;
  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      message: "We encountered an issue with the server.",
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: data.message ?? "We encountered an issue with the server.",
    };
  }
  const parsedData = contract.responseSchema.safeParse(data);
  if (!parsedData.success) {
    console.log(parsedData.error);
    console.log(response);
    return {
      ok: false,
      message: "We encountered an issue with the server.",
    };
  }
  return {
    ok: true,
    data: parsedData.data,
  };
}
