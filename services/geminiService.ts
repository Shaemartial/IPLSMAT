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
  // 1. Force search on reliable domains (ESPNcricinfo, Cricbuzz, BCCI).
  // 2. Force the model to calculate totals from the match log to avoid discrepancies.
  const prompt = `
    Act as a strict Cricket Statistician.
    
    Target Player: "${player.name}"
    State Team: "${player.smatTeam}"
    Tournament: "Syed Mushtaq Ali Trophy" (Current Season, matches started Nov 26).
    
    INSTRUCTIONS:
    1. SEARCH: Perform a targeted search for "${player.name}" profile and match log on 'ESPNcricinfo', 'Cricbuzz', or 'BCCI.tv'.
       Query hint: "site:espncricinfo.com ${player.name} Syed Mushtaq Ali Trophy 2024 2025 match log"
       
    2. EXTRACT: Find the match-by-match list for this specific tournament.
       - Look for matches played since November 26th.
       - Ignore matches from previous years or other formats (like Ranji/Vijay Hazare).
       - This is a T20 tournament.
    
    3. CALCULATE (Crucial):
       - Do NOT trust the "Total Runs" summary header on the page, as it might be outdated.
       - FIRST, extract the score for EVERY match played.
       - SECOND, SUM the runs and wickets yourself to populate the cumulative stats.
       - If a player played but did not bat, count it as 0 runs (DNB).
       - If a player played but did not bowl, count it as 0 wickets.
    
    4. DATA CONSISTENCY CHECK:
       - The length of "recentMatches" MUST equal the "matches" count.
       - The sum of runs in "recentMatches" MUST equal "runs".

    OUTPUT:
    Return a strictly valid JSON object with this schema:
    {
      "role": "Batsman" | "Bowler" | "All-Rounder" | "Wicket Keeper",
      "matches": number, // Count of items in recentMatches
      
      // Calculated Totals
      "innings": number,
      "runs": number, // SUM of runs from recentMatches
      "ballsFaced": number,
      "battingAverage": number, 
      "battingStrikeRate": number, 
      "highestScore": string, 

      "overs": number,
      "wickets": number, // SUM of wickets from recentMatches
      "runsConceded": number,
      "economy": number,
      "bowlingAverage": number,
      "bowlingStrikeRate": number,
      "bestBowling": string,

      // Chronological Match Log (Oldest to Newest, or Newest to Oldest - just be consistent)
      "recentMatches": [
         { 
           "date": "MMM DD", 
           "opponent": "vs TeamName", 
           "performance": "e.g. '12(8) & 0/20(4)' or 'DNB'" 
         }
      ],
      "summary": "Brief summary of form based on the match log."
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
