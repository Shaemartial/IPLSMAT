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
  
  // STRICT PROMPT BASED ON USER SPECIFICATION
  // We use systemInstruction to enforce the protocol.
  const SYSTEM_PROMPT = `
    Your job is to reliably fetch and aggregate Syed Mushtaq Ali Trophy (SMAT) 2025-26 stats for a single domestic Indian player who is also in the IPL 2026 squads. 
    You must only return information that can be verifiably sourced from official/canonical scorecards and you must never guess.

    ### Scope & Sources (HARD REQUIREMENTS)
    1. **Tournament scope**: Only use matches from "Syed Mushtaq Ali Trophy 2025-26" (India domestic T20). Ignore IPL, other domestic comps, friendlies, warm-ups.
    2. **Date window**: Only include matches from 26 Nov 2025 00:00 IST to now (IST).
    3. **Allowed domains**:
       - Primary: \`site:espncricinfo.com\` Full Scorecard pages.
       - Fallback: \`site:bcci.tv\` match/scorecard pages.
    4. **Mandatory verification**: Use the match ID embedded in the URL to deduplicate. The page title must explicitly mention SMAT 2025-26.

    ### Disambiguation (HARD REQUIREMENTS)
    - Use the state team provided (e.g. "${player.smatTeam}") to confirm the correct person.
    - If the lineup on the scorecard does not include the player for the state team, do not attribute any stats for that match.
    - If multiple people with the same name appear, only count the one on the specific state team.

    ### Quality & Anti-Hallucination Rules
    - **No invented matches**: Only include matches with a verified SMAT 2025-26 Full Scorecard URL.
    - **No partial guessing**: If a number is not visible, set it to 0 or null.
    - **Parsing Rule**: "14(10)" in cricket notation usually means 14 Runs off 10 Balls. "10(14)" means 10 Runs off 14 Balls. Prioritize the first number as runs unless context says "off".
    - **Search Strategy**:
       1. Search for Team Fixtures first to identify played matches.
       2. Search for Player Scorecards specifically for those matches.
       3. Count matches found since 26 Nov 2025. If < 6, add a note in summary.

    ### Output Format
    Return ONLY the following JSON structure:
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
      "summary": "Brief verification note. Mention if any matches were unresolved or excluded."
    }
  `;

  const USER_CONTENT = `
    PARAMETERS:
    player_name: "${player.name}"
    state_team: "${player.smatTeam}"
    tournament: "Syed Mushtaq Ali Trophy 2025-26"
    
    EXECUTE SEARCH STRATEGY:
    1. site:espncricinfo.com "Syed Mushtaq Ali Trophy 2025-26" "${player.smatTeam}" "Full Scorecard"
    2. site:espncricinfo.com "Syed Mushtaq Ali Trophy 2025-26" "Full Scorecard" "${player.smatTeam}" "Match"
    3. (Fallback) site:bcci.tv "Syed Mushtaq Ali Trophy" "${player.smatTeam}" "Scorecard"
  `;

  let attempts = 0;
  const maxAttempts = 3;
  let delay = 3000;

  while (attempts < maxAttempts) {
    try {
      // We use thinkingConfig to force the model to 'plan' the search steps (S1, S2, S3) 
      // ensuring it doesn't hallucinate a game just to fill a quota.
      const response = await ai.models.generateContent({
        model: model,
        contents: USER_CONTENT,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 4096 } 
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
