import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@rft/backend/routers";

export const trpc = createTRPCReact<AppRouter>();
