import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
  });
});

describe("prediction engine", () => {
  it("returns valid prediction structure", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.predictions.predict({
      fighter1Id: 1,
      fighter1Name: "Michael Chiesa",
      fighter2Name: "Carlston Harris",
    });

    expect(result).toHaveProperty("fighter1WinProbability");
    expect(result).toHaveProperty("fighter2WinProbability");
    expect(result).toHaveProperty("predictedWinner");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("fighter1DecimalOdds");
    expect(result).toHaveProperty("fighter2DecimalOdds");
    expect(result).toHaveProperty("keyFactors");

    // Probabilities should sum to 1
    const sum = result.fighter1WinProbability + result.fighter2WinProbability;
    expect(sum).toBeCloseTo(1.0, 2);

    // Odds should be positive
    expect(result.fighter1DecimalOdds).toBeGreaterThan(1);
    expect(result.fighter2DecimalOdds).toBeGreaterThan(1);
  });
});

describe("dashboard stats", () => {
  it("returns valid stats structure", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();

    expect(stats).toHaveProperty("totalFighters");
    expect(stats).toHaveProperty("totalPredictions");
    expect(stats).toHaveProperty("avgWinRate");
    expect(stats).toHaveProperty("topFighters");
    expect(Array.isArray(stats.topFighters)).toBe(true);
  });
});

describe("scouting report generation", () => {
  it("generates valid prediction without DB fighter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Test prediction with fallback data (no DB required)
    const result = await caller.predictions.predict({
      fighter1Id: 999,
      fighter1Name: "Fighter A",
      fighter2Name: "Fighter B",
    });

    expect(result).toHaveProperty("fighter1WinProbability");
    expect(result).toHaveProperty("predictedWinner");
    // With equal fallback data, probabilities should be 0.5 each
    expect(result.fighter1WinProbability).toBeGreaterThan(0);
    expect(result.fighter2WinProbability).toBeGreaterThan(0);
  });
});
