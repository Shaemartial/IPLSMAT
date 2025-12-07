# Project: IPL 2026 x SMAT 2025 Tracker (Final Specs)

## 1. The Goal
A real-time dashboard to track IPL 2026 squad members playing in the ongoing SMAT 2025/26 tournament.

## 2. Architecture & Data Flow

### A. Data Source (The Roster)
*   **Input**: You provided a CSV with ~120 players.
*   **Storage**: This will be hardcoded into `constants.ts` as the application's "Source of Truth".
*   **Filtering**: Players with "NA" in the SMAT Team column (e.g., Dhoni, Kohli) will be excluded from the main view as they aren't playing.
*   **Missing Data**: The CSV lacks "Player Role" (Batsman/Bowler).
    *   *Solution*: The app will not show a role initially. When the user clicks "Get Stats", the AI will identify the role and update the card.

### B. The "Update" Strategy (On-Demand)
*   **Initial Load**: The app loads instantly with the static list (Names + Teams). No API calls are made automatically to save cost/latency.
*   **User Action**: The user sees a "View Stats" or "Analyze" button on a player card.
*   **Execution**: Clicking the button triggers the Gemini API to search for that specific player's current SMAT performance.

### C. Stat Granularity (Cumulative + Deep Dive)
*   **View 1 (Card Face)**:
    *   Cumulative Stats (e.g., "Total Runs: 245", "Total Wickets: 12").
    *   A brief 1-sentence summary from AI.
*   **View 2 (Expansion/Modal)**:
    *   **Match-by-Match Breakdown**: A list of recent scores/figures (e.g., "vs Mumbai: 45 runs", "vs Delhi: 12 runs").
    *   This requires a complex AI prompt to parse match logs from search results.

### D. Visuals
*   **Theme**: IPL Team Colors are the primary visual identifier.
*   **Context**: SMAT Team name is clearly visible as secondary info.

---

## 3. Technical Implementation Plan

1.  **`types.ts`**: Update `Stats` interface to support an array of `matches` (Match-by-match history).
2.  **`constants.ts`**: Convert the CSV data into the `INITIAL_PLAYERS` array.
3.  **`geminiService.ts`**:
    *   Update prompt to ask for: `{ role, totalRuns, totalWickets, recentMatches: [{ opponent, score }] }`.
    *   This solves the missing "Role" issue dynamically.
4.  **`PlayerCard.tsx`**:
    *   Add "Expand" logic to show the match-by-match table.
    *   Handle the "Unknown Role" state.

## 4. Final Confirmation Questions
1.  **Roles**: Are you okay with the AI detecting the "Role" (Batsman/Bowler) during the fetch, or is it critical to have it beforehand? (I recommend AI detection).
2.  **Exclusions**: Confirm that players with "NA" for SMAT team should be hidden?

Once you confirm these two points, I am ready to generate the code.