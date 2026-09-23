import z from "zod";
import { Contract } from "../utils/contract";
import { withJsonBody } from "../utils/withJsonBody";
import { APIError } from "../type";

export function jsonRoute<Req extends z.ZodType, Res extends z.ZodType>(
  { requestSchema }: Contract<Req, Res>,
  handler: (data: z.infer<Req>, req: Request) => Promise<z.infer<Res>>,
) {
  return withJsonBody(requestSchema, async (data, req) => {
    try {
      return Response.json(await handler(data, req));
    } catch (error) {
      if (error instanceof APIError) {
        return Response.json({ message: error.message }, { status: error.code });
      }
      console.error(error);
      return Response.json({ message: "Unexpected server error." }, { status: 500 });
    }
  });
}
