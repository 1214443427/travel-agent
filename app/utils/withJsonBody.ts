import z from "zod";

type JsonHandler<T> = (data: T, req: Request) => Response | Promise<Response>;

export function withJsonBody<S extends z.ZodType>(schema: S, handler: JsonHandler<z.infer<S>>) {
  return async (req: Request): Promise<Response> => {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return Response.json(
        { statusText: "Bad request", message: "The request is malformed." },
        { status: 400 },
      );
    }
    const parsedData = schema.safeParse(raw);
    if (!parsedData.success) {
      return Response.json(
        {
          statusText: "Bad request",
          message: "The request is malformed.",
        },
        { status: 400 },
      );
    }
    return handler(parsedData.data, req);
  };
}
