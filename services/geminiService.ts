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
  
  // STRATEGY ADJUSTMENT:
  // 1. Explicitly list POTENTIAL dates to help AI 'hunt' for missing games in the text.
  // 2. Broaden search to "2025" to catch all variations of "2025/26" or "2025 season".
  // 3. Force "Deep Scan" instruction.
  
  const prompt = `
    Act as a Cricket Statistician.
    
    TARGET: "${player.name}"
    TEAM: "${player.smatTeam}"
    TOURNAMENT: Syed Mushtaq Ali Trophy 2025/26 (Matches in Nov-Dec 2025).

    **CRITICAL GOAL**:
    You must find the COMPLETE list of matches played by this player in this tournament.
    Teams usually play 6-7 Group Matches.
    Common Match Dates in this schedule (Check text for these dates):
    - Nov 23
    - Nov 25 / Nov 26
    - Nov 27 / Nov 28
    - Nov 29 / Nov 30
    - Dec 2 / Dec 3
    - Dec 5 / Dec 6
    - Dec 9 (Knockouts)

    **INSTRUCTIONS**:
    1. **SEARCH**: 
       Execute a search for: "${player.name} ${player.smatTeam} Syed Mushtaq Ali Trophy 2025 matches score list espncricinfo bcci"
    
    2. **EXTRACTION**:
       - Scan the search results for ANY of the dates listed above.
       - **DO NOT STOP** after finding 1 or 2 matches. Look for the full history.
       - If a match happened on Dec 2, Dec 6, etc., it MUST be included.
       - Ignore matches from previous years (2024 or earlier). Only Nov/Dec 2025.
    
    3. **PARSING RULES**:
       - **1 Run**: "1(5)" or "1" -> 1 Run. (Do not confuse with 0).
       - **0 Runs**: "0(4)" or "duck" -> 0 Runs.
       - **Wickets**: "3/24" -> 3 Wickets.
       - **DNB**: Did Not Bat -> 0 Runs, 0 Innings.
    
    4. **CALCULATION**:
       - Sum the Runs and Wickets from the extracted list MANUALLY.
       - Do NOT rely on the "Total" row from the site as it might be outdated. Calculate: Sum(Match 1 + Match 2 + ...).

    OUTPUT (JSON):
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
      "summary": "Brief stats summary (e.g. 'Played 5 matches, consistent wicket-taker')."
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
