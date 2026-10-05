import { describe, expect, it } from "vitest";
import {
  campaignBatchCountersSchema,
  createCampaignInputSchema,
  getCampaignProgressInputSchema,
  planCampaignStateInputSchema,
  recordCampaignBatchInputSchema,
} from "./schemas";

const counters = {
  discovered: 4,
  qualified: 2,
  queued: 2,
  contacted: 1,
  rejected: 2,
};

describe("state campaign schemas", () => {
  it("accepts a bounded ordered state queue and rejects duplicate state codes", () => {
    const base = {
      idempotencyKey: "campaign-create-1",
      name: "Nationwide independent restaurants",
      stateQueue: [
        { code: "TX", name: "Texas" },
        { code: "FL", name: "Florida" },
      ],
      maxSendsPerRun: 3,
    };
    expect(createCampaignInputSchema.safeParse(base).success).toBe(true);
    expect(
      createCampaignInputSchema.safeParse({
        ...base,
        stateQueue: [base.stateQueue[0], base.stateQueue[0]],
      }).success,
    ).toBe(false);
  });

  it("requires unique, bounded area keys", () => {
    const base = {
      idempotencyKey: "campaign-plan-1",
      campaignId: crypto.randomUUID(),
      stateCode: "TX",
      areas: [
        { key: "austin-metro", label: "Austin metro" },
        { key: "houston-metro", label: "Houston metro" },
      ],
    };
    expect(planCampaignStateInputSchema.safeParse(base).success).toBe(true);
    expect(
      planCampaignStateInputSchema.safeParse({
        ...base,
        areas: [base.areas[0], base.areas[0]],
      }).success,
    ).toBe(false);
  });

  it("keeps campaign counters internally consistent", () => {
    expect(campaignBatchCountersSchema.safeParse(counters).success).toBe(true);
    expect(campaignBatchCountersSchema.safeParse({ ...counters, qualified: 5 }).success).toBe(false);
    expect(campaignBatchCountersSchema.safeParse({ ...counters, queued: 3 }).success).toBe(false);
    expect(campaignBatchCountersSchema.safeParse({ ...counters, contacted: 3 }).success).toBe(false);
  });

  it("allows an empty area list only for a statewide sweep", () => {
    const base = {
      idempotencyKey: "campaign-batch-1",
      campaignId: crypto.randomUUID(),
      stateCode: "TX",
      completedAreaKeys: [],
      counters: { discovered: 0, qualified: 0, queued: 0, contacted: 0, rejected: 0 },
    };
    expect(recordCampaignBatchInputSchema.safeParse(base).success).toBe(false);
    expect(recordCampaignBatchInputSchema.safeParse({ ...base, statewideSweep: true }).success).toBe(true);
  });

  it("resumes a campaign by stable name or id", () => {
    expect(
      getCampaignProgressInputSchema.safeParse({ campaignName: "us-local-business-outreach-v1" }).success,
    ).toBe(true);
    expect(
      getCampaignProgressInputSchema.safeParse({ campaignId: crypto.randomUUID() }).success,
    ).toBe(true);
    expect(getCampaignProgressInputSchema.safeParse({}).success).toBe(false);
  });
});
