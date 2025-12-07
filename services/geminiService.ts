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
  // CRITICAL: Thinking allows the model to verify the scorecard URL before extracting numbers.
  const model = "gemini-2.5-flash";

  // The system instruction acts as the "Auditor Guidelines"
  const SYSTEM_INSTRUCTION = `
You are an expert Cricket Statistician.
Target: Find verified match stats for "${player.name}" playing for "${player.smatTeam}" in "Syed Mushtaq Ali Trophy 2025-26".

**VERIFICATION PROTOCOL (Must Follow):**
1.  **TOURNAMENT SCOPE**: 
    -   You MUST only include matches from the **2025-26 season** of Syed Mushtaq Ali Trophy.
    -   **VALIDATION SIGNAL**: Trust URLs containing \`syed-mushtaq-ali-trophy-2025-26\` or \`series/14494\` (the ESPN ID). 
    -   Do not discard a match just because the specific date is missing in the snippet, as long as the Series ID confirms it is the current tournament.

2.  **PLAYER MATCH**:
    -   The player ("${player.name}") MUST appear in the scorecard (Playing XI or Sub).
    -   If they are not in the scorecard, IGNORE the match.

3.  **DATA PARSING (CRITICAL)**:
    -   **Batting**: Look for "Runs(Balls)". 
        -   "14(10)" = 14 Runs.
        -   "10(14)" = 10 Runs.
        -   Rule: The first number is typically Runs. 
    -   **Bowling**: Look for "Overs-Maidens-Runs-Wickets" (e.g., 4-0-28-2).
    -   **DNB**: If played but DNB -> Innings: 0, Runs: 0.

**OUTPUT GOAL**:
Aggregate stats from ALL found confirmed scorecards. If no scorecards are found, return "matches": 0.
`;

  // The User Prompt defines the specific search context
  const USER_PROMPT = `
Action: Fetch verifiable stats for ${player.name} (${player.smatTeam}) in SMAT 2025-26.

**EXECUTE SEARCH QUERIES:**
1. site:espncricinfo.com "Syed Mushtaq Ali Trophy 2025-26" "${player.smatTeam}" "${player.name}" scorecard
2. site:espncricinfo.com "Syed Mushtaq Ali Trophy 2025-26" "${player.smatTeam}" match result
3. site:bcci.tv "Syed Mushtaq Ali Trophy" "${player.smatTeam}" scorecard

**REQUIRED JSON OUTPUT FORMAT:**
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
      { "date": "DD MMM", "opponent": "vs Team", "performance": "e.g. 24(12) & 1/20" }
  ],
  "summary": "Brief note on how many matches were verified."
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
          // Thinking budget helps the model browse the search results intelligently
          // and reject "Upcoming" matches while keeping "Result" matches.
          thinkingConfig: { thinkingBudget: 4096 }, 
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
