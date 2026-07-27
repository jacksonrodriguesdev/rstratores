import { createServerFn } from "@tanstack/react-start";
import * as server from "./homepage.server";

export const listHomepageBlocks = createServerFn({ method: "GET" }).handler(async () => {
  return await server.listHomepageBlocks();
});

export const createHomepageBlock = createServerFn({ method: "POST" })
  .validator((d: { type: string; active: boolean; position: number; title?: string; config?: string }) => d)
  .handler(async ({ data }) => {
    return await server.createHomepageBlock(data);
  });

export const updateHomepageBlock = createServerFn({ method: "POST" })
  .validator((d: { id: number; active?: boolean; position?: number; title?: string; config?: string }) => d)
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    return await server.updateHomepageBlock(id, rest);
  });

export const deleteHomepageBlock = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    return await server.deleteHomepageBlock(data.id);
  });

export type HomepageBlock = server.HomepageBlock;
