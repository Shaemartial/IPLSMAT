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
  
  // STRATEGY: FIXTURE-FIRST DISCOVERY
  // Instead of asking "How did Player X do?", we ask "What are the results for Team Y?".
  // Then we map Player X to those results. This ensures we don't miss games where the player failed or was quiet.
  
  const prompt = `
    Act as a strict Cricket Data Auditor.
    
    **OBJECTIVE**: 
    Build a COMPLETE match log for Player: "${player.name}" 
    Playing for Team: "${player.smatTeam}" 
    Tournament: Syed Mushtaq Ali Trophy 2025 (SMAT).

    **THE PROBLEM**: 
    Simple searches often miss games. You must verify the FULL schedule.

    **YOUR EXECUTION PLAN (Fixture-First Strategy)**:
    1.  **STEP 1: FIND THE TEAM SCHEDULE**
        - Search for the full list of match results for the team "**${player.smatTeam}**" in SMAT 2025 (Nov & Dec).
        - Teams in this tournament typically play 5 to 7 Group Matches. 
        - Find the results for ALL of them.
    
    2.  **STEP 2: CHECK PLAYER PARTICIPATION**
        - For *each* match found in Step 1, check the scorecard.
        - Did **${player.name}** play? 
        - If YES: Extract runs, balls, wickets, overs.
        - If NO: Ignore the match.

    3.  **STEP 3: COMPILE STATS**
        - Sum the data from the matches found.
        - **DO NOT** rely on pre-calculated "Total" rows from websites as they might be outdated. Calculate the sum yourself.

    **SEARCH QUERY**:
    "${player.smatTeam} cricket team Syed Mushtaq Ali Trophy 2025 match results scorecard ${player.name}"

    **STRICT PARSING RULES**:
    - **Format**: T20 Only (Exclude Ranji/Hazare).
    - **Dates**: Nov 2025 - Dec 2025.
    - **Batting**: "14(10)" = 14 Runs. "0(3)" = 0 Runs. "DNB" = 0 Runs, 0 Innings.
    - **Bowling**: "3/20" = 3 Wickets. "0/40" = 0 Wickets.
    
    **OUTPUT JSON**:
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
           "date": "MMM DD", 
           "opponent": "vs TeamName", 
           "performance": "e.g. 45(30) & 0/15" 
         }
      ],
      "summary": "Brief summary. Mention if they missed any games."
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
