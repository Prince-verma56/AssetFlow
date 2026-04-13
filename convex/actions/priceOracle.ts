"use node";

import { v } from "convex/values";
import { z } from "zod";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { ANCHOR_DATE_ISO, ANCHOR_MONTH_LABEL, ANCHOR_SEASON_CONTEXT } from "../../lib/time-anchor";
import { fetchAgmarknetRecords, seasonalFallbackRecords, type AgmarknetRecord } from "../../lib/agmarknet";

const OracleSchema = z.object({
  fairPrice: z.number(),
  confidence: z.number().min(0).max(100),
  recommendation: z.enum(["sell_now", "wait", "negotiate"]),
  reasoning: z.string().min(1),
  forecast14: z.array(z.number()).length(14),
});

export const runPriceOracle = action({
  args: {
    commodity: v.string(),
    state: v.string(),
    city: v.string(),
    quantity: v.number(),
    unit: v.string(),
  },
  handler: async (ctx, args) => {
    let records: AgmarknetRecord[] = await fetchAgmarknetRecords({
      commodity: args.commodity,
      state: args.state,
      market: args.city,
    }).catch(() => []);

    if (records.length === 0) {
      records = seasonalFallbackRecords({
        commodity: args.commodity,
        state: args.state,
        market: args.city,
      });
    }

    const mandi = records[0];
    const isFallback = mandi.source === "fallback";
    console.log(`[Oracle] Running for ${args.commodity}. Source: ${mandi.source}. Mandi Modal: ${mandi.modalPrice}`);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("[Oracle] OPENROUTER_API_KEY is missing");
      throw new Error("OPENROUTER_API_KEY is missing.");
    }

    const systemPrompt =
      `Today is ${ANCHOR_MONTH_LABEL} 7, 2026 (${ANCHOR_SEASON_CONTEXT}). ` +
      `Current month: ${ANCHOR_MONTH_LABEL}. Current date: ${ANCHOR_DATE_ISO}. ` +
      "You are a Senior Indian Agricultural Market Analyst with deep knowledge of the 2026 Rabi Harvest. " +
      "Your goal is to provide a dynamic, highly-accurate fair price forecast that accounts for current supply/demand in April 2026. " +
      "When given Mandi prices (Min, Max, Modal), analyze the spread and suggest a fairPrice (INR/quintal) that the farmer should target. " +
      "Include reasoning about seasonal factors like 'peak arrival pressure' or 'procurement targets' to show you are doing real research. " +
      "Return strict JSON with keys: fairPrice, confidence, recommendation, reasoning, forecast14. " +
      "forecast14 must be 14 daily price predictions for April 8 to April 21, 2026. " +
      (isFallback 
        ? "CRITICAL: The provided data is a seasonal baseline. Use your internal knowledge of the April 2026 harvest in this region to adjust the fair price dynamically. Warn the farmer about 'Low Confidence' due to missing live data." 
        : "");

    const userPrompt =
      (isFallback ? "WARNING: No live scraper data. Using seasonal harvest models. " : "LIVE SCRAPER DATA AVAILABLE. ") +
      `Market Location: ${args.city}, ${args.state}. Commodity: ${args.commodity}. Quantity: ${args.quantity} ${args.unit}. ` +
      `Current Mandi Stats from ${mandi.date}: Min: ₹${mandi.minPrice}, Max: ₹${mandi.maxPrice}, Modal: ₹${mandi.modalPrice}. ` +
      "Provide a fair farmgate price that beats local middlemen and reflect on the market conditions for this specific crop in April 2026.";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Farmer Dashboard Oracle",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        temperature: 0.7, // Increased from 0.3 for more variance
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("[Oracle] API Error:", payload.error);
      throw new Error(payload.error?.message || "Oracle model request failed.");
    }

    const rawJson = payload.choices?.[0]?.message?.content ?? "{}";
    console.log("[Oracle] Raw Response:", rawJson);
    const parsed = OracleSchema.safeParse(JSON.parse(rawJson));
    if (!parsed.success) {
      throw new Error("Oracle output failed schema validation.");
    }

    await ctx.runMutation(internal.listingOracleInternal.syncOracleIntoListings, {
      commodity: args.commodity,
      mandiModalPrice: mandi.modalPrice,
      oraclePrice: parsed.data.fairPrice,
      confidence: parsed.data.confidence,
      recommendation: parsed.data.recommendation,
    });

    return {
      ...parsed.data,
      mandiDate: mandi.date,
      mandiModalPrice: mandi.modalPrice,
      mandiMinPrice: mandi.minPrice,
      mandiMaxPrice: mandi.maxPrice,
    };
  },
});
