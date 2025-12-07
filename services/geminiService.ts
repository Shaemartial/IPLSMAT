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
  
  // STRATEGY:
  // 1. Strict Source: ESPNcricinfo OR BCCI.tv ONLY. (Explicitly ban Cricbuzz to avoid inconsistencies).
  // 2. Strict Date/Tournament: Syed Mushtaq Ali Trophy 2025 (SMAT 2025). Start Date: Nov 26, 2025.
  // 3. Manual Summation: AI must calculate totals from the match log to ensure 100% consistency.
  const prompt = `
    Act as a strict Cricket Statistician.
    
    Target Player: "${player.name}"
    State Team: "${player.smatTeam}"
    Tournament: "Syed Mushtaq Ali Trophy" (SMAT) - 2025/26 Season.
    
    CRITICAL REQUIREMENTS:
    1. **START DATE**: The tournament fixture for this player's team started on **Nov 26, 2025**.
       - You MUST include the match played on Nov 26, 2025.
       - You MUST include ALL matches played after that date.
       - Ignore any matches from 2024 or earlier.
    
    2. **SOURCES**: Use ONLY **espncricinfo.com** or **bcci.tv**.
       - **DO NOT USE CRICBUZZ.**
       - **DO NOT USE WIKIPEDIA.**
       
    3. **METHODOLOGY**:
       - Search for: "site:espncricinfo.com OR site:bcci.tv ${player.name} ${player.smatTeam} Syed Mushtaq Ali Trophy 2025 match log"
       - Extract the specific score for EVERY match found since Nov 26, 2025.
       - **CALCULATE TOTALS MANUALLY**: Sum the runs and wickets from your extracted list. Do not trust the "Total" row on the webpage as it might be cached.
    
    4. **CONSISTENCY CHECK**:
       - Ensure the "matches" count equals the number of items in "recentMatches".
       - Ensure the "runs" total equals the sum of runs in "recentMatches".

    OUTPUT (Strict JSON):
    {
      "role": "Batsman" | "Bowler" | "All-Rounder" | "Wicket Keeper",
      "matches": number, 
      "innings": number,
      "runs": number, // MUST equal sum of recentMatches runs
      "ballsFaced": number,
      "battingAverage": number, 
      "battingStrikeRate": number, 
      "highestScore": string, 

      "overs": number,
      "wickets": number, // MUST equal sum of recentMatches wickets
      "runsConceded": number,
      "economy": number,
      "bowlingAverage": number,
      "bowlingStrikeRate": number,
      "bestBowling": string,

      "recentMatches": [
         { 
           "date": "MMM DD", // e.g. "Nov 26"
           "opponent": "vs TeamName", 
           "performance": "e.g. '12(8) & 0/20(4)' or 'DNB'" 
         }
      ],
      "summary": "One sentence summary mentioning the source used."
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
