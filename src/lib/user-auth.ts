import { createServerFn } from "@tanstack/react-start";
import type { SessionPayload } from "./auth";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any): Promise<SessionPayload | null> => {
    const { getSession } = await import("./auth.server");
    return await getSession();
  },
);
