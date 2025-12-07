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
  
  // Updated prompt to enforce full tournament coverage since Nov 26
  const prompt = `
    Act as a Cricket Data Analyst.
    
    Target Player: "${player.name}"
    State Team: "${player.smatTeam}"
    Tournament: "Syed Mushtaq Ali Trophy 2025-26" (SMAT).
    
    CONTEXT:
    The tournament matches started on Nov 26. Most teams have played roughly 6 matches so far.
    
    TASK:
    1. Search for the COMPLETE list of matches played by "${player.smatTeam}" in this tournament starting from Nov 26.
    2. For EVERY single match found, check if "${player.name}" was in the playing XI.
    3. If they played, extract their exact batting (runs, balls) and bowling (wickets, runs, overs) figures.
    
    CRITICAL: 
    - Do NOT just give me the last 3 matches. I need ALL matches since Nov 26.
    - If the player did not bat or bowl in a match they played, note it as "DNB" or "0/0".
    
    OUTPUT:
    Return a strictly valid JSON object with this schema:
    {
      "role": "Batsman" | "Bowler" | "All-Rounder" | "Wicket Keeper", // Determine based on performance
      "matches": number, // Total matches played by the player
      
      // Cumulative Stats (Sum of all matches found)
      "innings": number,
      "runs": number,
      "ballsFaced": number,
      "battingAverage": number, 
      "battingStrikeRate": number, 
      "highestScore": string, 

      // Cumulative Bowling
      "overs": number,
      "wickets": number,
      "runsConceded": number,
      "economy": number,
      "bowlingAverage": number,
      "bowlingStrikeRate": number,
      "bestBowling": string,

      // Full Match Log (Must include ALL matches found since Nov 26)
      "recentMatches": [
         { 
           "date": "MMM DD", // e.g. "Nov 26"
           "opponent": "vs TeamName", 
           "performance": "e.g. 'Bat: 12(8) | Bowl: 1/24(4)'" 
         }
      ],
      "summary": "Brief summary of their form in this tournament."
    }
  `;

  let attempts = 0;
  const maxAttempts = 3;
  let delay = 2000; // Start with 2 seconds

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
      
      // Check for 429 or Resource Exhausted errors
      const isQuotaError = error.status === 429 || 
                           (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota')));

      if (isQuotaError && attempts < maxAttempts - 1) {
        console.warn(`Quota hit. Retrying in ${delay}ms...`);
        await wait(delay);
        delay *= 2; // Exponential backoff: 2s -> 4s -> 8s
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
