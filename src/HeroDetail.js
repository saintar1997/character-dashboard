import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Hero Detail modal component
const HeroDetail = ({
  hero,
  onClose,
  characterStats,
  laneStats,
  synergies,
  counters,
  data,
}) => {
  if (!hero) return null;

  // Get hero stats from characterStats
  const heroStat = characterStats[hero] || {
    pickCount: 0,
    winCount: 0,
    banCount: 0,
  };

  // Calculate win rate
  const winRate = heroStat.pickCount > 0
    ? ((heroStat.winCount / heroStat.pickCount) * 100).toFixed(2)
    : '0.00';

  // Get lane data for this hero
  const heroLaneData = {};
  const lanes = ['dark', 'farm', 'mid', 'abyssal', 'support'];
  
  lanes.forEach(lane => {
    if (laneStats[lane][hero]) {
      heroLaneData[lane] = {
        pickCount: laneStats[lane][hero].pickCount,
        winCount: laneStats[lane][hero].winCount,
        winRate: laneStats[lane][hero].pickCount > 0
          ? ((laneStats[lane][hero].winCount / laneStats[lane][hero].pickCount) * 100).toFixed(2)
          : '0.00'
      };
    } else {
      heroLaneData[lane] = { pickCount: 0, winCount: 0, winRate: '0.00' };
    }
  });

  // Get synergies with this hero
  const heroSynergies = synergies.filter(
    syn => syn.char1 === hero || syn.char2 === hero
  ).map(syn => {
    // Get the other hero in the synergy
    const otherHero = syn.char1 === hero ? syn.char2 : syn.char1;
    // Get the lane of the hero and other hero
    const heroLane = syn.char1 === hero ? syn.lane1 : syn.lane2;
    const otherHeroLane = syn.char1 === hero ? syn.lane2 : syn.lane1;
    
    return {
      ...syn,
      otherHero,
      heroLane,
      otherHeroLane
    };
  });

  // Parse matchup data from counters
  const processedCounters = counters.map(counter => {
    const [pick, against] = counter.matchup.split(" vs ");
    return {
      ...counter,
      pick,
      against
    };
  });

  // Get counter data - heroes this hero is good against
  const goodAgainst = processedCounters
    .filter(counter => counter.pick === hero && parseFloat(counter.winRate) > 50)
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

  // Get counter data - heroes this hero struggles against
  const badAgainst = processedCounters
    .filter(counter => counter.against === hero && parseFloat(counter.winRate) > 50)
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

  // Prepare data for win rate by lane chart
  const laneWinRateData = lanes.map(lane => ({
    name: formatLaneName(lane),
    winRate: parseFloat(heroLaneData[lane].winRate) || 0,
    pickCount: heroLaneData[lane].pickCount || 0,
  }));

  // Prepare data for win/loss pie chart
  const winLossData = [
    { name: 'Wins', value: heroStat.winCount },
    { name: 'Losses', value: heroStat.pickCount - heroStat.winCount },
  ];
  const COLORS = ['#00C49F', '#FF8042'];

  // Get hero rank based on pick count
  const rankByPickCount = Object.entries(characterStats)
    .map(([char, stats]) => ({ char, pickCount: stats.pickCount }))
    .sort((a, b) => b.pickCount - a.pickCount)
    .findIndex(item => item.char === hero) + 1;

  // Get hero rank based on win rate (min 5 games)
  const rankByWinRate = Object.entries(characterStats)
    .filter(([_, stats]) => stats.pickCount >= 5)
    .map(([char, stats]) => ({
      char,
      winRate: stats.pickCount > 0 ? (stats.winCount / stats.pickCount) * 100 : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .findIndex(item => item.char === hero) + 1;

  // Helper function to format lane names
  function formatLaneName(lane) {
    switch (lane) {
      case 'dark': return 'Dark Lane';
      case 'farm': return 'Farm Lane';
      case 'mid': return 'Mid Lane';
      case 'abyssal': return 'Abyssal Lane';
      case 'support': return 'Support Lane';
      default: return lane;
    }
  }

  return (
    <div className="hero-detail-modal">
      <div className="hero-detail-content">
        <div className="hero-detail-header">
          <h2>{hero} Details</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="hero-detail-body">
          <div className="two-column-layout">
            {/* Summary Section */}
            <div className="content-card">
              <h3 className="section-title">Hero Summary</h3>
              <div className="hero-summary">
                <div className="stat-item">
                  <span className="stat-label">Total Picks:</span>
                  <span className="stat-value">{heroStat.pickCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Wins:</span>
                  <span className="stat-value">{heroStat.winCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Win Rate:</span>
                  <span className="stat-value">{winRate}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Ban Count:</span>
                  <span className="stat-value">{heroStat.banCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Popularity Rank:</span>
                  <span className="stat-value">#{rankByPickCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Win Rate Rank:</span>
                  <span className="stat-value">
                    {rankByWinRate > 0 ? `#${rankByWinRate}` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="chart-container" style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Games']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lane Performance */}
            <div className="content-card">
              <h3 className="section-title">Lane Performance</h3>
              <table className="data-table-sm">
                <thead>
                  <tr>
                    <th>Lane</th>
                    <th className="text-right">Pick Count</th>
                    <th className="text-right">Win Count</th>
                    <th className="text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {lanes.map(lane => (
                    <tr key={lane}>
                      <td>{formatLaneName(lane)}</td>
                      <td className="text-right">{heroLaneData[lane].pickCount}</td>
                      <td className="text-right">{heroLaneData[lane].winCount}</td>
                      <td className="text-right">{heroLaneData[lane].winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="chart-container" style={{ height: '200px', marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={laneWinRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value, name, props) => [
                      `${value}% (${props.payload.pickCount} games)`, 'Win Rate'
                    ]} />
                    <Bar dataKey="winRate" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Synergies */}
          <div className="content-card" style={{ marginTop: '20px' }}>
            <h3 className="section-title">Best Synergies with {hero}</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Partner Hero</th>
                    <th>Partner Lane</th>
                    <th>{hero}'s Lane</th>
                    <th className="text-right">Games Together</th>
                    <th className="text-right">Wins</th>
                    <th className="text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {heroSynergies
                    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
                    .map((synergy, index) => (
                      <tr key={index}>
                        <td>{synergy.otherHero}</td>
                        <td>{formatLaneName(synergy.otherHeroLane)}</td>
                        <td>{formatLaneName(synergy.heroLane)}</td>
                        <td className="text-right">{synergy.games}</td>
                        <td className="text-right">{synergy.wins}</td>
                        <td className="text-right">{synergy.winRate}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="two-column-layout" style={{ marginTop: '20px' }}>
            {/* Good Against */}
            <div className="content-card">
              <h3 className="section-title">{hero} Counters These Heroes</h3>
              <table className="data-table-sm">
                <thead>
                  <tr>
                    <th>Hero</th>
                    <th>Enemy Lane</th>
                    <th className="text-right">Games</th>
                    <th className="text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {goodAgainst.slice(0, 10).map((counter, index) => (
                    <tr key={index}>
                      <td>{counter.against}</td>
                      <td>{formatLaneName(counter.againstLane)}</td>
                      <td className="text-right">{counter.games}</td>
                      <td className="text-right">{counter.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bad Against */}
            <div className="content-card">
              <h3 className="section-title">These Heroes Counter {hero}</h3>
              <table className="data-table-sm">
                <thead>
                  <tr>
                    <th>Hero</th>
                    <th>Enemy Lane</th>
                    <th className="text-right">Games</th>
                    <th className="text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {badAgainst.slice(0, 10).map((counter, index) => (
                    <tr key={index}>
                      <td>{counter.pick}</td>
                      <td>{formatLaneName(counter.pickLane)}</td>
                      <td className="text-right">{counter.games}</td>
                      <td className="text-right">{counter.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroDetail;