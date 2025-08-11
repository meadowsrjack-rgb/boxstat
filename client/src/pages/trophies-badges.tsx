import { useAuth } from "@/hooks/useAuth";

export default function TrophiesBadges() {
  const { user } = useAuth();

  const achievements = [
    {
      id: 'first_game',
      title: 'First Game',
      icon: '🏀',
      achieved: true,
      tier: 'starter'
    },
    {
      id: 'team_player',
      title: 'Team Player',
      icon: '🤝',
      achieved: true,
      tier: 'all-star'
    },
    {
      id: 'top_scorer',
      title: 'Top Scorer',
      icon: '🎯',
      achieved: false,
      tier: 'superstar'
    },
    {
      id: 'hall_of_fame',
      title: 'Hall of Fame',
      icon: '👑',
      achieved: false,
      tier: 'hall-of-fame'
    }
  ];

  const trophies = [
    {
      id: 'season_mvp',
      title: 'Season MVP',
      icon: '🏆',
      achieved: false,
      type: 'team'
    },
    {
      id: 'championship',
      title: 'Championship',
      icon: '🥇',
      achieved: true,
      type: 'legacy'
    }
  ];

  const getTierColor = (tier: string, achieved: boolean) => {
    if (!achieved) return 'bg-gray-200 text-gray-500';
    
    switch (tier) {
      case 'hall-of-fame':
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-yellow-500';
      case 'superstar':
        return 'bg-gradient-to-br from-purple-500 to-purple-700 text-white border-purple-600';
      case 'all-star':
        return 'bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-600';
      case 'starter':
        return 'bg-gradient-to-br from-green-500 to-green-700 text-white border-green-600';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-700 text-white border-gray-600';
    }
  };

  const getTrophyColor = (type: string, achieved: boolean) => {
    if (!achieved) return 'bg-gray-200 text-gray-500';
    
    switch (type) {
      case 'legacy':
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-yellow-500';
      case 'team':
        return 'bg-gradient-to-br from-red-500 to-red-700 text-white border-red-600';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-700 text-white border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Achievement Gallery
          </h1>
          <p className="text-xl text-gray-600">
            Track your basketball journey and celebrate your victories
          </p>
        </div>

        {/* Badges Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Badges</h2>
            <p className="text-gray-600">
              Unlock achievements as you progress through your basketball journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`
                  rounded-2xl p-6 text-center border-2 transition-all duration-300 hover:scale-105 cursor-pointer
                  ${getTierColor(achievement.tier, achievement.achieved)}
                  ${achievement.achieved ? 'shadow-lg' : 'shadow-sm'}
                `}
                data-testid={`badge-${achievement.id}`}
              >
                <div className="relative inline-block mb-4">
                  <div className={`text-6xl ${!achievement.achieved ? 'opacity-40 grayscale' : ''}`}>
                    {achievement.icon}
                  </div>
                  {achievement.achieved && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{achievement.title}</h3>
                <div className="text-sm opacity-75 capitalize">{achievement.tier.replace('-', ' ')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trophies Section */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Trophies</h2>
            <p className="text-gray-600">
              Major accomplishments and milestone achievements
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {trophies.map((trophy) => (
              <div
                key={trophy.id}
                className={`
                  rounded-2xl p-8 text-center border-4 transition-all duration-300 hover:scale-105 cursor-pointer
                  ${getTrophyColor(trophy.type, trophy.achieved)}
                  ${trophy.achieved ? 'shadow-xl' : 'shadow-sm'}
                `}
                data-testid={`trophy-${trophy.id}`}
              >
                <div className="relative inline-block mb-6">
                  <div className={`text-8xl ${!trophy.achieved ? 'opacity-40 grayscale' : ''}`}>
                    {trophy.icon}
                  </div>
                  {trophy.achieved && (
                    <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      ✓
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-2">{trophy.title}</h3>
                <div className="text-sm opacity-75 capitalize">{trophy.type} Trophy</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Your Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {achievements.filter(a => a.achieved).length}/{achievements.length}
              </div>
              <div className="text-gray-600">Badges Earned</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {trophies.filter(t => t.achieved).length}/{trophies.length}
              </div>
              <div className="text-gray-600">Trophies Won</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {Math.round(((achievements.filter(a => a.achieved).length + trophies.filter(t => t.achieved).length) / (achievements.length + trophies.length)) * 100)}%
              </div>
              <div className="text-gray-600">Completion Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}