import { createServerFn } from "@tanstack/react-start";
import { getSession, type SessionPayload } from "./auth.server";

export const getSessionFn = createServerFn({ method: "GET" })
  .handler(async (ctx: any): Promise<SessionPayload | null> => {
    console.log("getSessionFn ctx keys:", Object.keys(ctx || {}));
    return await getSession();
  });
