import { COOKIE_NAME } from "./_shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { insertLead } from "./db";
import { notifyOwner } from "./_core/notification";
import { z } from "zod";
import {
  fightersRouter,
  fightsRouter,
  scoutingSubRouter,
  predictionsRouter,
  eventsRouter,
  dashboardRouter,
} from "./scouting/scoutingRouter";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  leads: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        phone: z.string().min(8),
        modality: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await insertLead(input);
        await notifyOwner({
          title: `Novo Lead RFT: ${input.name}`,
          content: `Nome: ${input.name}\nTelefone: ${input.phone}\nModalidade: ${input.modality}`,
        });
        return { success: true };
      }),
  }),

  fighters: fightersRouter,
  fights: fightsRouter,
  scouting: scoutingSubRouter,
  predictions: predictionsRouter,
  events: eventsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
