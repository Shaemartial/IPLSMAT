import React, { useState, useMemo } from 'react';
import { Player, IPLTeam, PlayerRole } from '../types';
import PlayerCard from './PlayerCard';
import { IPL_TEAMS_CONFIG } from '../constants';

interface DashboardProps {
  players: Player[];
  onPlayerUpdate: (id: string, newStats: any, newRole: PlayerRole) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ players, onPlayerUpdate }) => {
  const [selectedTeam, setSelectedTeam] = useState<IPLTeam | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesTeam = selectedTeam === 'ALL' || p.iplTeam === selectedTeam;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.smatTeam.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTeam && matchesSearch;
    });
  }, [players, selectedTeam, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
           <div className="text-slate-400 text-sm font-medium">Total Players Tracked</div>
           <div className="text-3xl font-bold text-white mt-1">{players.length}</div>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
           <div className="text-slate-400 text-sm font-medium">Teams Active in SMAT</div>
           <div className="text-3xl font-bold text-blue-400 mt-1">
             {new Set(players.map(p => p.smatTeam)).size}
           </div>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
           <div className="text-slate-400 text-sm font-medium">Last Update Check</div>
           <div className="text-lg font-bold text-green-400 mt-2 truncate">
             {new Date().toLocaleDateString()}
           </div>
        </div>
      </div>

      {/* Controls */}
      <div className="sticky top-4 z-10 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Team Filter */}
          <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTeam('ALL')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedTeam === 'ALL' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  All Teams
                </button>
                {Object.keys(IPL_TEAMS_CONFIG).map((team) => (
                  <button
                    key={team}
                    onClick={() => setSelectedTeam(team as IPLTeam)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${
                      selectedTeam === team 
                        ? `${IPL_TEAMS_CONFIG[team as IPLTeam].color} text-white border-transparent shadow-lg` 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    {team}
                  </button>
                ))}
             </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-blue-500 transition-colors sm:text-sm"
              placeholder="Search player or state team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPlayers.map(player => (
          <PlayerCard 
            key={player.id} 
            player={player} 
            onUpdate={onPlayerUpdate} 
          />
        ))}
      </div>

      {filteredPlayers.length === 0 && (
         <div className="text-center py-20">
            <div className="text-slate-500 text-lg">No players found matching your criteria.</div>
         </div>
      )}
    </div>
  );
};

export default Dashboard;
