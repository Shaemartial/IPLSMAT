import React, { useState } from 'react';
import { Player, IPLTeam, PlayerRole } from '../types';
import { IPL_TEAMS_CONFIG } from '../constants';
import { fetchLatestPlayerStats } from '../services/geminiService';

interface PlayerCardProps {
  player: Player;
  onUpdate: (id: string, newStats: any, newRole: PlayerRole) => void;
}

const StatBox = ({ label, value, highlight = false }: { label: string, value: string | number | undefined, highlight?: boolean }) => (
  <div className="bg-slate-900/40 p-2 rounded border border-slate-700/50 flex flex-col justify-between h-full">
    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
    <div className={`text-sm font-mono font-semibold ${highlight ? 'text-white' : 'text-slate-300'}`}>
      {value ?? '-'}
    </div>
  </div>
);

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const teamConfig = IPL_TEAMS_CONFIG[player.iplTeam];
  const stats = player.stats;
  
  // Logic to determine what stats sections to show
  const showBatting = player.role === 'Batsman' || player.role === 'All-Rounder' || player.role === 'Wicket Keeper' || (stats.runs && stats.runs > 0);
  const showBowling = player.role === 'Bowler' || player.role === 'All-Rounder' || (stats.wickets && stats.wickets > 0);

  const handleUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const { stats: newStats, role } = await fetchLatestPlayerStats(player);
      if (newStats) {
        onUpdate(player.id, { ...player.stats, ...newStats }, role);
        setExpanded(true); // Auto expand on update
      }
    } catch (e: any) {
      alert(e.message || "Failed to update stats. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg transition-all duration-300 ${expanded ? 'ring-2 ring-blue-500/50' : 'hover:border-slate-500'}`}>
      {/* Header Band */}
      <div className={`h-2 w-full ${teamConfig.color}`}></div>
      
      <div className="p-4">
        {/* Top Section: Identity */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">
              {player.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 ${teamConfig.textColor} border border-slate-600`}>
                {player.iplTeam}
              </span>
              <span className="text-xs text-slate-400">
                Playing for <span className="text-slate-200 font-medium">{player.smatTeam}</span>
              </span>
            </div>
          </div>
          <div className={`text-[10px] font-medium px-2 py-1 rounded border ${player.role === 'Unknown' ? 'bg-slate-800 text-slate-600 border-slate-700' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
             {player.role === 'Unknown' ? 'Role Unset' : player.role}
          </div>
        </div>

        {/* Primary Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
           <div className="bg-slate-900/60 p-2 rounded border border-slate-700 text-center">
             <div className="text-[10px] text-slate-500 uppercase">Mat</div>
             <div className="text-base font-bold text-white">{stats.matches || 0}</div>
           </div>
           
           {/* Dynamic Summary Stats based on Role */}
           {showBatting ? (
             <>
               <div className="bg-slate-900/60 p-2 rounded border border-slate-700 text-center col-span-1">
                 <div className="text-[10px] text-slate-500 uppercase">Runs</div>
                 <div className="text-base font-bold text-green-400">{stats.runs || 0}</div>
               </div>
               <div className="bg-slate-900/60 p-2 rounded border border-slate-700 text-center col-span-2">
                 <div className="text-[10px] text-slate-500 uppercase">HS / SR</div>
                 <div className="text-base font-bold text-white">{stats.highestScore || '-'} <span className="text-slate-500 text-xs font-normal">/</span> {stats.battingStrikeRate || '-'}</div>
               </div>
             </>
           ) : showBowling ? (
             <>
               <div className="bg-slate-900/60 p-2 rounded border border-slate-700 text-center col-span-1">
                 <div className="text-[10px] text-slate-500 uppercase">Wkts</div>
                 <div className="text-base font-bold text-blue-400">{stats.wickets || 0}</div>
               </div>
               <div className="bg-slate-900/60 p-2 rounded border border-slate-700 text-center col-span-2">
                 <div className="text-[10px] text-slate-500 uppercase">Best / Eco</div>
                 <div className="text-base font-bold text-white">{stats.bestBowling || '-'} <span className="text-slate-500 text-xs font-normal">/</span> {stats.economy || '-'}</div>
               </div>
             </>
           ) : (
             <div className="col-span-3 bg-slate-900/30 rounded border border-slate-800 flex items-center justify-center text-xs text-slate-500 italic">
               No stats loaded
             </div>
           )}
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center pt-2">
           <button 
             onClick={() => setExpanded(!expanded)}
             className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
           >
             {expanded ? 'Hide Details' : 'Show Detailed Stats'}
             <svg className={`w-3 h-3 transform transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>

           <button 
             onClick={handleUpdate}
             disabled={loading}
             className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5
               ${loading 
                 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                 : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
               }`}
           >
             {loading ? <span className="animate-pulse">AI Updating...</span> : 'Update Stats'}
           </button>
        </div>

        {/* EXPANDED SECTION */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
            {stats.summary && (
              <p className="text-xs text-slate-400 italic mb-4 bg-slate-900/50 p-2 rounded border-l-2 border-slate-600">
                "{stats.summary}"
              </p>
            )}

            {/* Detailed Grid */}
            <div className="space-y-4">
              {showBatting && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Batting Details</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <StatBox label="Innings" value={stats.innings} />
                    <StatBox label="Balls" value={stats.ballsFaced} />
                    <StatBox label="Avg" value={stats.battingAverage} highlight />
                    <StatBox label="SR" value={stats.battingStrikeRate} />
                    <StatBox label="HS" value={stats.highestScore} highlight />
                    <StatBox label="Runs" value={stats.runs} highlight />
                  </div>
                </div>
              )}

              {showBowling && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 mt-2">Bowling Details</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <StatBox label="Overs" value={stats.overs} />
                    <StatBox label="Runs Given" value={stats.runsConceded} />
                    <StatBox label="Wickets" value={stats.wickets} highlight />
                    <StatBox label="Eco" value={stats.economy} highlight />
                    <StatBox label="Avg" value={stats.bowlingAverage} />
                    <StatBox label="SR" value={stats.bowlingStrikeRate} />
                  </div>
                </div>
              )}
            </div>

            {/* Recent Match History */}
            {stats.recentMatches && stats.recentMatches.length > 0 && (
              <div className="mt-4">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Recent Form</h4>
                 <div className="space-y-1">
                    {stats.recentMatches.map((match, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-900/40 px-3 py-2 rounded text-xs border border-slate-800">
                        <span className="text-slate-400">{match.opponent}</span>
                        <span className="font-mono text-white font-medium">{match.performance}</span>
                      </div>
                    ))}
                 </div>
              </div>
            )}
            
            <div className="mt-2 text-[9px] text-slate-600 text-right">
              Last fetched: {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
