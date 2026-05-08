import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db and notification
const mockInsertLead = vi.fn().mockResolvedValue(undefined);
const mockNotifyOwner = vi.fn().mockResolvedValue(true);

vi.mock("./db", () => ({
  insertLead: (...args: unknown[]) => mockInsertLead(...args),
  getAllLeads: vi.fn().mockResolvedValue([]),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: (...args: unknown[]) => mockNotifyOwner(...args),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("leads.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should submit a valid lead, call insertLead and notifyOwner with correct payload", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const leadData = {
      name: "João Silva",
      phone: "21999999999",
      modality: "MMA Profissional",
    };

    const result = await caller.leads.submit(leadData);

    expect(result).toEqual({ success: true });

    // Verify insertLead was called with the correct data
    expect(mockInsertLead).toHaveBeenCalledOnce();
    expect(mockInsertLead).toHaveBeenCalledWith(leadData);

    // Verify notifyOwner was called with name, phone and modality
    expect(mockNotifyOwner).toHaveBeenCalledOnce();
    const notifyCall = mockNotifyOwner.mock.calls[0][0];
    expect(notifyCall.title).toContain("João Silva");
    expect(notifyCall.content).toContain("João Silva");
    expect(notifyCall.content).toContain("21999999999");
    expect(notifyCall.content).toContain("MMA Profissional");
  });

  it("should reject lead with name too short", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.leads.submit({
        name: "J",
        phone: "21999999999",
        modality: "Boxe",
      })
    ).rejects.toThrow();

    expect(mockInsertLead).not.toHaveBeenCalled();
    expect(mockNotifyOwner).not.toHaveBeenCalled();
  });

  it("should reject lead with phone too short", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.leads.submit({
        name: "João Silva",
        phone: "123",
        modality: "Boxe",
      })
    ).rejects.toThrow();

    expect(mockInsertLead).not.toHaveBeenCalled();
  });

  it("should reject lead with empty modality", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.leads.submit({
        name: "João Silva",
        phone: "21999999999",
        modality: "",
      })
    ).rejects.toThrow();

    expect(mockInsertLead).not.toHaveBeenCalled();
  });

  it("should send notification with all three lead fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.leads.submit({
      name: "Maria Santos",
      phone: "21988887777",
      modality: "Jiu-Jitsu",
    });

    const notifyCall = mockNotifyOwner.mock.calls[0][0];
    expect(notifyCall.content).toContain("Maria Santos");
    expect(notifyCall.content).toContain("21988887777");
    expect(notifyCall.content).toContain("Jiu-Jitsu");
  });
});
