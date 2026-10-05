export type HomepageBlock = {
  id: number;
  type: string;
  active: boolean;
  position: number;
  title: string | null;
  config: string | null; // JSON string
};

import { createServerFn } from "@tanstack/react-start";

export const listHomepageBlocks = createServerFn({ method: "GET" }).handler(async () => {
  const server = await import("./homepage.server");
  return await server.listHomepageBlocks();
});

export const createHomepageBlock = createServerFn({ method: "POST" })
  .validator(
    (d: { type: string; active: boolean; position: number; title?: string; config?: string }) => d,
  )
  .handler(async ({ data }) => {
    await (await import("./auth.server")).assertAdmin();
    const server = await import("./homepage.server");
    return await server.createHomepageBlock(data);
  });

export const updateHomepageBlock = createServerFn({ method: "POST" })
  .validator(
    (d: { id: number; active?: boolean; position?: number; title?: string; config?: string }) => d,
  )
  .handler(async ({ data }) => {
    await (await import("./auth.server")).assertAdmin();
    const server = await import("./homepage.server");
    const { id, ...rest } = data;
    return await server.updateHomepageBlock(id, rest);
  });

export const deleteHomepageBlock = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await (await import("./auth.server")).assertAdmin();
    const server = await import("./homepage.server");
    return await server.deleteHomepageBlock(data.id);
  });
