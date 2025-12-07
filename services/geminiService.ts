import { GoogleGenAI } from "@google/genai";
import { Player, DetailedStats, PlayerRole } from "../types";

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Robust JSON parser that handles Markdown code blocks and potential noise.
 */
const cleanAndParseJSON = (text: string) => {
  try {
    // 1. Clean markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const cleanText = jsonMatch ? jsonMatch[1] : text;

    // 2. Find the JSON object boundaries
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error("No JSON object found in response");
    }

    const jsonString = cleanText.substring(start, end + 1);
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    throw new Error("Failed to parse AI response");
  }
};

/**
 * Deliberate delay to respect rate limits if needed
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchLatestPlayerStats = async (player: Player): Promise<{ stats: Partial<DetailedStats>, role: PlayerRole, source?: string }> => {
  if (!ai) {
    throw new Error("API Key not found.");
  }

  // We use the 2.5-flash model which supports the thinking config.
  // We need a VERY HIGH budget to allow the model to iterate through 6 distinct scorecards.
  const model = "gemini-2.5-flash";

  // The system instruction acts as the "Strict Auditor Guidelines"
  const SYSTEM_INSTRUCTION = `
You are a meticulous Cricket Statistician and Data Auditor.
**Mission:** Audit the performance of player "${player.name}" for the team "${player.smatTeam}" in the "Syed Mushtaq Ali Trophy (SMAT) 2025-26".

**AUDIT BASELINE (Expectation):**
As of Dec 7, 2025, most teams have played approximately 6 League Matches since Nov 23.
Your goal is to find ALL of them.

**STRICT EXECUTION STEPS:**
1.  **Establish the Schedule:** First, identify the list of matches played by "${player.smatTeam}" in SMAT 2025-26.
2.  **Verify Scorecards:** For EACH match, find the Official "Full Scorecard" (ESPNcricinfo preferred, BCCI fallback).
3.  **Check Participation:** Open the scorecard. Is "${player.name}" in the Playing XI or Impact Subs?
    *   **YES:** Extract stats.
    *   **NO:** Do not count this match.
    *   **DNB (Did Not Bat):** If in XI but DNB, Count as 1 Match, 0 Innings, 0 Runs.

**DATA EXTRACTION RULES (Zero Tolerance for Guessing):**
*   **Date Window:** Only include matches played AFTER **Nov 26, 2025**.
*   **Parsing Ambiguity:** "24(12)" vs "12(24)". 
    *   Look for column headers in the text. 
    *   Context: If 4s=4 and 6s=2, then Runs must be >= 28. Use logic to verify which number is Runs.
*   **Missing Data:** If a scorecard is not available, DO NOT INVENT STATS. List it as "Missing/Unverified" in the summary.

**OUTPUT:**
Aggregate the valid data into the JSON format.
`;

  // The User Prompt defines the specific search strategy requested by the user.
  const USER_PROMPT = `
**AUDIT TARGET:**
Player: ${player.name}
Team: ${player.smatTeam}
Tournament: SMAT 2025-26
Date Range: 26 Nov 2025 to Present

**SEARCH STRATEGY (Follow Order):**
1.  **Find Team Fixtures:** site:espncricinfo.com "Syed Mushtaq Ali Trophy 2025-26" "${player.smatTeam}" match results
2.  **Find Scorecards:** site:espncricinfo.com "Syed Mushtaq Ali Trophy 2025-26" "${player.smatTeam}" "Full Scorecard"
3.  **Fallback:** site:bcci.tv "Syed Mushtaq Ali Trophy" "${player.smatTeam}" "Scorecard"

**REQUIRED JSON OUTPUT:**
{
  "role": "Batsman" | "Bowler" | "All-Rounder" | "Wicket Keeper",
  "matches": number, 
  "innings": number,
  "runs": number,
  "ballsFaced": number,
  "battingAverage": number,
  "battingStrikeRate": number,
  "highestScore": string,
  
  "wickets": number,
  "runsConceded": number,
  "overs": number,
  "economy": number,
  "bestBowling": string,

  "recentMatches": [
      // List EVERY verified match found (aim for 6)
      { 
        "date": "DD MMM", 
        "opponent": "vs Team", 
        "performance": "e.g. Bat: 45(23) | Bowl: 1/24 (4ov)" 
      }
  ],
  "summary": "Audited [X] matches. Missing matches: [List dates/opponents if any were not found or player didn't play]."
}
`;

  let attempts = 0;
  const maxAttempts = 2; 

  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: USER_PROMPT,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          // CRITICAL: High thinking budget (16k) to allow the model to iterate through ~6 matches
          // and process the search results for each one.
          thinkingConfig: { thinkingBudget: 16000 }, 
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");

      // Extract source URL for citation
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const sourceUrl = groundingMetadata?.groundingChunks?.[0]?.web?.uri;

      const data = cleanAndParseJSON(text);

      return {
        stats: {
          matches: data.matches || 0,
          innings: data.innings || 0,
          runs: data.runs || 0,
          ballsFaced: data.ballsFaced || 0,
          battingAverage: data.battingAverage || 0,
          battingStrikeRate: data.battingStrikeRate || 0,
          highestScore: data.highestScore || "-",
          overs: data.overs || 0,
          wickets: data.wickets || 0,
          runsConceded: data.runsConceded || 0,
          economy: data.economy || 0,
          bowlingAverage: data.bowlingAverage || 0,
          bowlingStrikeRate: data.bowlingStrikeRate || 0,
          bestBowling: data.bestBowling || "-",
          recentMatches: Array.isArray(data.recentMatches) ? data.recentMatches : [],
          summary: data.summary || "Data verified via AI",
          lastUpdated: new Date().toISOString()
        },
        role: data.role || 'Unknown',
        source: sourceUrl
      };

    } catch (error: any) {
      console.error(`Fetch Attempt ${attempts + 1} Error:`, error);

      if (error.status === 429 || error.message?.includes('429')) {
        if (attempts < maxAttempts - 1) {
          console.log("Quota limit hit, waiting...");
          await wait(3000 * (attempts + 1));
          attempts++;
          continue;
        }
        throw new Error("Server is busy (Rate Limit). Please try again.");
      }

      if (attempts === maxAttempts - 1) {
        throw new Error("Could not verify stats. Please try again.");
      }
      
      attempts++;
    }
  }

  throw new Error("Unexpected error in stat service.");
};
