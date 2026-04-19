import { describe, it, expect } from "vitest";
import { SUBSCRIPTION_STATUS_TRANSITIONS, DUNNING_SCHEDULE, OVERAGE_RATES_PAISE } from "../types";

describe("Billing Types & Constants", () => {
  describe("SUBSCRIPTION_STATUS_TRANSITIONS", () => {
    it("should allow trialing -> active", () => {
      expect(SUBSCRIPTION_STATUS_TRANSITIONS.trialing).toContain("active");
    });

    it("should allow active -> past_due", () => {
      expect(SUBSCRIPTION_STATUS_TRANSITIONS.active).toContain("past_due");
    });

    it("should allow active -> paused", () => {
      expect(SUBSCRIPTION_STATUS_TRANSITIONS.active).toContain("paused");
    });

    it("should allow active -> canceled", () => {
      expect(SUBSCRIPTION_STATUS_TRANSITIONS.active).toContain("canceled");
    });

    it("should allow past_due -> active (payment recovered)", () => {
      expect(SUBSCRIPTION_STATUS_TRANSITIONS.past_due).toContain("active");
    });

    it("should allow past_due -> canceled", () => {
      expect(SUBSCRIPTION_STATUS_TRANSITIONS.past_due).toContain("canceled");
    });

    it("should allow paused -> active", () => {
      expect(SUBSCRIPTION_STATUS_TRANSITIONS.paused).toContain("active");
    });

    it("should NOT allow canceled -> active (no resurrection)", () => {
      expect(SUBSCRIPTION_STATUS_TRANSITIONS.canceled).not.toContain("active");
    });

    it("should NOT allow trialing -> paused directly", () => {
      expect(SUBSCRIPTION_STATUS_TRANSITIONS.trialing).not.toContain("paused");
    });
  });

  describe("DUNNING_SCHEDULE", () => {
    it("should have 6 attempts", () => {
      expect(DUNNING_SCHEDULE).toHaveLength(6);
    });

    it("should start at day 1", () => {
      expect(DUNNING_SCHEDULE[0].dayOffset).toBe(1);
    });

    it("should end at day 30", () => {
      expect(DUNNING_SCHEDULE[5].dayOffset).toBe(30);
    });

    it("should have increasing day offsets", () => {
      for (let i = 1; i < DUNNING_SCHEDULE.length; i++) {
        expect(DUNNING_SCHEDULE[i].dayOffset).toBeGreaterThan(DUNNING_SCHEDULE[i - 1].dayOffset);
      }
    });

    it("should have increasing attempt numbers", () => {
      for (let i = 0; i < DUNNING_SCHEDULE.length; i++) {
        expect(DUNNING_SCHEDULE[i].attempt).toBe(i + 1);
      }
    });

    it("should escalate from friendly to urgent", () => {
      expect(DUNNING_SCHEDULE[0].severity).toBe("friendly");
      expect(DUNNING_SCHEDULE[5].severity).toBe("final");
    });
  });

  describe("OVERAGE_RATES_PAISE", () => {
    it("should have rates for pdf_jobs", () => {
      expect(OVERAGE_RATES_PAISE.pdf_jobs).toBeDefined();
      expect(OVERAGE_RATES_PAISE.pdf_jobs).toBeGreaterThan(BigInt(0));
    });

    it("should have rates for pixel_jobs", () => {
      expect(OVERAGE_RATES_PAISE.pixel_jobs).toBeDefined();
      expect(OVERAGE_RATES_PAISE.pixel_jobs).toBeGreaterThan(BigInt(0));
    });

    it("should have rates for api_requests", () => {
      expect(OVERAGE_RATES_PAISE.api_requests).toBeDefined();
    });

    it("should have rates for storage_gb", () => {
      expect(OVERAGE_RATES_PAISE.storage_gb).toBeDefined();
    });

    it("should have rates for email_sends", () => {
      expect(OVERAGE_RATES_PAISE.email_sends).toBeDefined();
    });
  });
});
