import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { Player, PlayerRole } from './types';
import { INITIAL_PLAYERS } from './constants';

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load initial data
  useEffect(() => {
    // In a real app we might check localStorage here first
    const saved = localStorage.getItem('ipl_smat_players');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge saved stats with current roster structure (in case constants changed)
        // For simplicity, we just use saved if it matches length, or reset if significantly different
        // Ideally we would map ID to ID.
        if (parsed.length > 0) {
           setPlayers(parsed);
        } else {
           setPlayers(INITIAL_PLAYERS);
        }
      } catch (e) {
        setPlayers(INITIAL_PLAYERS);
      }
    } else {
      setPlayers(INITIAL_PLAYERS);
    }
    setHasLoaded(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (hasLoaded) {
      localStorage.setItem('ipl_smat_players', JSON.stringify(players));
    }
  }, [players, hasLoaded]);

  const handlePlayerUpdate = (id: string, newStats: any, newRole: PlayerRole) => {
    setPlayers(prevPlayers => 
      prevPlayers.map(p => 
        p.id === id 
          ? { ...p, stats: newStats, role: newRole !== 'Unknown' ? newRole : p.role } 
          : p
      )
    );
  };

  if (!hasLoaded) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Loading Roster...</div>;

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            IPL 2026 x SMAT
          </h1>
        </div>
        <div className="text-xs text-slate-500 border border-slate-800 px-2 py-1 rounded">
           v1.0 • Live Tracker
        </div>
      </nav>

      <Dashboard players={players} onPlayerUpdate={handlePlayerUpdate} />
    </div>
  );
};

export default App;
