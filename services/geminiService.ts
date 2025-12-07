import { GoogleGenAI } from "@google/genai";
import { Player, DetailedStats, PlayerRole } from "../types";

const apiKey = process.env.API_KEY; 
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helper to clean and parse JSON from Markdown response
const cleanAndParseJSON = (text: string) => {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (e) {
    // 2. Try extracting from markdown code blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        // Continue to step 3
      }
    }
    
    // 3. Try finding the first '{' and last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch (e3) {
         throw new Error("Failed to parse JSON from response");
      }
    }
    throw new Error("No JSON found in response");
  }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchLatestPlayerStats = async (player: Player): Promise<{ stats: Partial<DetailedStats>, role: PlayerRole, source?: string }> => {
  if (!ai) {
    throw new Error("API Key not found.");
  }

  const model = "gemini-2.5-flash"; 
  
  // FIXED STRATEGY:
  // 1. Terminology: Use "2025-26" as the official season name per user instruction.
  // 2. Search: Keywords 'espncricinfo' and 'bcci'.
  // 3. Parsing: Explicit examples for low scores (1 run vs 0).
  const prompt = `
    Act as a Data Parser for Cricket.
    
    Target: "${player.name}"
    Team: "${player.smatTeam}"
    Tournament: "Syed Mushtaq Ali Trophy 2025-26" (Matches playing in Nov/Dec 2025).
    
    INSTRUCTIONS:
    1. **SEARCH QUERY**: Execute a search for: 
       "${player.name} ${player.smatTeam} Syed Mushtaq Ali Trophy 2025-26 match scorecard match log espncricinfo bcci"
    
    2. **DATA EXTRACTION RULES**:
       - Look for the list of matches played since **Nov 26, 2025**.
       - **MISSING GAMES**: Be careful. Do not skip games. Look for matches played on dates like Nov 23, Nov 25, Nov 27, Nov 29, Dec 2, Dec 6 (Dates vary by group).
       - **SCORE PARSING**:
         - "1(5)" means **1 Run**. It is NOT 0.
         - "0(2)" means **0 Runs**.
         - "DNB" means Did Not Bat (0 Runs, 0 Innings).
         - "3/24" means 3 Wickets for 24 runs.
       
    3. **CALCULATION**:
       - Extract the performance for EACH match found.
       - Sum them up manually.
       - If the search result has a "Total" row, verify it against your sum. If they differ, trust the sum of the individual match logs.

    OUTPUT SCHEMA (JSON Only):
    {
      "role": "Batsman" | "Bowler" | "All-Rounder" | "Wicket Keeper",
      "matches": number, 
      "innings": number,
      "runs": number, 
      "ballsFaced": number,
      "battingAverage": number, 
      "battingStrikeRate": number, 
      "highestScore": string, 

      "overs": number,
      "wickets": number, 
      "runsConceded": number,
      "economy": number,
      "bowlingAverage": number,
      "bowlingStrikeRate": number,
      "bestBowling": string,

      "recentMatches": [
         { 
           "date": "MMM DD", 
           "opponent": "vs TeamName", 
           "performance": "e.g. '1(6) & 0/12' or 'DNB'" 
         }
      ],
      "summary": "Brief stats summary."
    }
  `;

  let attempts = 0;
  const maxAttempts = 3;
  let delay = 2000;

  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const sourceUrl = groundingMetadata?.groundingChunks?.[0]?.web?.uri;
      
      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const data = cleanAndParseJSON(text);

      return {
        stats: {
          matches: data.matches || 0,
          innings: data.innings,
          runs: data.runs,
          ballsFaced: data.ballsFaced,
          battingAverage: data.battingAverage,
          battingStrikeRate: data.battingStrikeRate,
          highestScore: data.highestScore,
          overs: data.overs,
          wickets: data.wickets,
          runsConceded: data.runsConceded,
          economy: data.economy,
          bowlingAverage: data.bowlingAverage,
          bowlingStrikeRate: data.bowlingStrikeRate,
          bestBowling: data.bestBowling,
          recentMatches: data.recentMatches || [],
          summary: data.summary,
          lastUpdated: new Date().toISOString()
        },
        role: data.role || 'Unknown',
        source: sourceUrl
      };

    } catch (error: any) {
      console.error(`Attempt ${attempts + 1} failed:`, error);
      
      const isQuotaError = error.status === 429 || 
                           (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota')));

      if (isQuotaError && attempts < maxAttempts - 1) {
        console.warn(`Quota hit. Retrying in ${delay}ms...`);
        await wait(delay);
        delay *= 2; 
        attempts++;
        continue;
      }
      
      if (isQuotaError) {
        throw new Error("API Usage Limit Reached. Please wait a minute before trying again.");
      }

      throw error;
    }
  }
  
  throw new Error("Failed to fetch stats after multiple attempts.");
};
