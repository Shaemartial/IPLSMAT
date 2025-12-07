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
  
  // FINAL RECOVERY STRATEGY: AUTHORITY SOURCE ONLY
  // The previous method "guessed" games. This method forces the AI to look at 
  // trusted databases (ESPNcricinfo, Cricbuzz, BCCI) and only report what it sees.
  
  const prompt = `
    You are a data extraction engine for Cricket Stats.
    
    TARGET PLAYER: "${player.name}"
    TEAM: "${player.smatTeam}"
    TOURNAMENT: Syed Mushtaq Ali Trophy 2025 (SMAT)
    DATE RANGE: Nov 2025 - Dec 2025

    **YOUR TASK:**
    1. Search SPECIFICALLY for the scorecard profile on trusted sites.
    2. Extract the exact scores from the most recent matches.
    
    **SEARCH QUERY:**
    site:espncricinfo.com OR site:cricbuzz.com OR site:bcci.tv "${player.name}" "${player.smatTeam}" Syed Mushtaq Ali Trophy 2025 scorecard

    **CRITICAL RULES (ZERO HALLUCINATION):**
    1. **NO PREDICTIONS**: Ignore "Fantasy Tips", "Predicted XI", or "Dream11" articles. They contain fake stats.
    2. **STRICT MATCHING**: Only log a match if you see a **Scorecard Result**.
    3. **RUNS vs BALLS**: 
       - Text "14(10)" means **14 Runs** (10 Balls).
       - Text "10(14)" means **10 Runs** (14 Balls).
       - ALWAYS prioritize the first number as Runs unless the text explicitly says "10 runs off 14 balls".
    4. **DNB (Did Not Bat)**: If a player played but didn't bat, Runs = 0, Innings = 0.
    5. **NO FAKE GAMES**: If the search results only show 2 games, output 2 games. Do not invent a 3rd game to fill space.

    **OUTPUT JSON FORMAT:**
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
         { 
           "date": "Date/Month", 
           "opponent": "vs Team", 
           "performance": "e.g. 45(30) & 0/15" 
         }
      ],
      "summary": "One sentence summary of verified matches."
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
