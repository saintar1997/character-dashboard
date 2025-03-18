import React, { useState, useMemo } from 'react';
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
  Legend,
} from 'recharts';

// Hero Detail modal component
const HeroDetail = ({
  hero,
  onClose,
  characterStats,
  laneStats,
  synergies,
  tripleSynergies,
  quadSynergies,
  counters,
  data,
  isMobile = false,
}) => {
  // State for synergy tab selection
  const [activeSynergyTab, setActiveSynergyTab] = useState("pairs");
  
  // Add sort configuration states for each table
  const [pairSynergySort, setPairSynergySort] = useState({ key: "winRate", direction: "desc" });
  const [tripleSynergySort, setTripleSynergySort] = useState({ key: "winRate", direction: "desc" });
  const [quadSynergySort, setQuadSynergySort] = useState({ key: "winRate", direction: "desc" });
  const [goodAgainstSort, setGoodAgainstSort] = useState({ key: "winRate", direction: "desc" });
  const [badAgainstSort, setBadAgainstSort] = useState({ key: "winRate", direction: "desc" });
  const [laneSort, setLaneSort] = useState({ key: "winRate", direction: "desc" });

  // Process triple synergies for this hero
  const heroTripleSynergies = useMemo(() => {
    if (!tripleSynergies || !hero) return [];
    
    return tripleSynergies
      .filter(trio => 
        trio.char1 === hero || trio.char2 === hero || trio.char3 === hero
      )
      .map(trio => {
        // Get the other heroes in the synergy
        const otherHeroes = [trio.char1, trio.char2, trio.char3].filter(char => char !== hero);
        
        return {
          ...trio,
          otherHeroes
        };
      });
  }, [tripleSynergies, hero]);

  // Process quad synergies for this hero
  const heroQuadSynergies = useMemo(() => {
    if (!quadSynergies || !hero) return [];
    
    return quadSynergies
      .filter(quad => 
        quad.char1 === hero || quad.char2 === hero || quad.char3 === hero || quad.char4 === hero
      )
      .map(quad => {
        // Get the other heroes in the synergy
        const otherHeroes = [quad.char1, quad.char2, quad.char3, quad.char4].filter(char => char !== hero);
        
        return {
          ...quad,
          otherHeroes
        };
      });
  }, [quadSynergies, hero]);

  // NOW we can do the conditional return
  if (!hero) return null;

  // Process counters data to ensure pick and against fields are available
  const processedCounters = counters.map(counter => {
    const [pick, against] = counter.matchup.split(" vs ");
    return {
      ...counter,
      pick,
      against
    };
  });

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

  // Get counter data - heroes this hero is good against
  const goodAgainst = processedCounters
    .filter(counter => counter.pick === hero && parseFloat(counter.winRate) > 50);

  // Get counter data - heroes this hero struggles against
  const badAgainst = processedCounters
    .filter(counter => counter.against === hero && parseFloat(counter.winRate) > 50);

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

  // Request a sort function
  const requestSort = (key, sortConfigSetter, sortConfig) => {
    if (!key) return;
    
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    
    sortConfigSetter({ key, direction });
  };

  // Helper function to get value for sorting
  const getValueForSort = (value) => {
    if (value === undefined || value === null) return 0;

    if (typeof value === "string" && value.includes("%")) {
      return parseFloat(value.replace("%", ""));
    }

    if (typeof value === "string" && !isNaN(value)) {
      return parseFloat(value);
    }

    return value;
  };

  // Get sort class for a column header
  const getSortClass = (key, sortConfig) => {
    if (!key) return "";
    
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? "sort-asc" : "sort-desc";
    }
    return "";
  };

  // Function to sort data based on sort configuration
  const sortData = (data, sortConfig) => {
    if (!data || !sortConfig || !sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      // Skip if key doesn't exist in objects
      if (!(sortConfig.key in a) || !(sortConfig.key in b)) return 0;
      
      const aValue = getValueForSort(a[sortConfig.key]);
      const bValue = getValueForSort(b[sortConfig.key]);

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  // Add this function to render hero name links for multiple heroes
  const renderMultiHeroNames = (heroes, separator = ", ") => {
    return heroes.map((heroName, index, array) => (
      <React.Fragment key={index}>
        <span className="hero-name-link">
          {heroName}
        </span>
        {index < array.length - 1 && separator}
      </React.Fragment>
    ));
  };

  // Table container style for horizontal scrolling on mobile
  const tableContainerStyle = {
    overflowX: 'auto',
    width: '100%',
    WebkitOverflowScrolling: 'touch',
    marginBottom: '15px'
  };

  // Chart height adjustment for mobile
  const chartHeight = isMobile ? 200 : 300;

  // Convert lane data to array for sorting
  const laneDataArray = lanes.map(lane => ({
    lane,
    laneName: formatLaneName(lane),
    pickCount: heroLaneData[lane].pickCount,
    winCount: heroLaneData[lane].winCount,
    winRate: heroLaneData[lane].winRate
  }));

  // Sort lane data
  const sortedLaneData = sortData(laneDataArray, laneSort);

  // Sort synergies data
  const sortedHeroSynergies = sortData(heroSynergies, pairSynergySort);
  const sortedTripleSynergies = sortData(heroTripleSynergies, tripleSynergySort);
  const sortedQuadSynergies = sortData(heroQuadSynergies, quadSynergySort);
  
  // Sort counter data
  const sortedGoodAgainst = sortData(goodAgainst, goodAgainstSort);
  const sortedBadAgainst = sortData(badAgainst, badAgainstSort);

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

              <div className="chart-container" style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={isMobile ? 60 : 80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={isMobile
                        ? ({ name, percent }) => `${(percent * 100).toFixed(1)}%`
                        : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Games']} />
                    {!isMobile && <Legend />}
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lane Performance */}
            <div className="content-card">
              <h3 className="section-title">Lane Performance</h3>
              <div style={tableContainerStyle}>
                <table className="data-table-sm">
                  <thead>
                    <tr>
                      <th
                        className={`sortable ${getSortClass("laneName", laneSort)}`}
                        onClick={() => requestSort("laneName", setLaneSort, laneSort)}
                      >
                        Lane
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("pickCount", laneSort)} text-right`}
                        onClick={() => requestSort("pickCount", setLaneSort, laneSort)}
                      >
                        Pick Count
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("winCount", laneSort)} text-right`}
                        onClick={() => requestSort("winCount", setLaneSort, laneSort)}
                      >
                        Win Count
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("winRate", laneSort)} text-right`}
                        onClick={() => requestSort("winRate", setLaneSort, laneSort)}
                      >
                        Win Rate
                        <span className="sort-indicator"></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLaneData.map(laneData => (
                      <tr key={laneData.lane}>
                        <td>{isMobile 
                          ? laneData.laneName.split(' ')[0]
                          : laneData.laneName}
                        </td>
                        <td className="text-right">{laneData.pickCount}</td>
                        <td className="text-right">{laneData.winCount}</td>
                        <td className="text-right">{laneData.winRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="chart-container" style={{ height: chartHeight, marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={laneWinRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={isMobile ? { fontSize: 10 } : {}}
                      tickFormatter={isMobile 
                        ? (lane) => lane.split(' ')[0] // Just show "Dark", "Farm", etc. on mobile
                        : (lane) => lane}
                    />
                    <YAxis label={isMobile 
                      ? null
                      : { value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip formatter={(value, name, props) => [
                      `${value}% (${props.payload.pickCount} games)`, 'Win Rate'
                    ]} />
                    <Bar dataKey="winRate" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Synergies Tabs */}
          <div className="content-card" style={{ marginTop: '20px' }}>
            <h3 className="section-title">Synergies with {hero}</h3>
            
            <div className="synergy-type-tabs">
              <div
                className={`synergy-type-tab ${activeSynergyTab === "pairs" ? "synergy-type-tab-active" : ""}`}
                onClick={() => setActiveSynergyTab("pairs")}
              >
                2-Hero
              </div>
              <div
                className={`synergy-type-tab ${activeSynergyTab === "triples" ? "synergy-type-tab-active" : ""}`}
                onClick={() => setActiveSynergyTab("triples")}
              >
                3-Hero
              </div>
              <div
                className={`synergy-type-tab ${activeSynergyTab === "quads" ? "synergy-type-tab-active" : ""}`}
                onClick={() => setActiveSynergyTab("quads")}
              >
                4-Hero
              </div>
            </div>
            
            {/* Pair Synergies Table */}
            {activeSynergyTab === "pairs" && (
              <div style={tableContainerStyle}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th
                        className={`sortable ${getSortClass("otherHero", pairSynergySort)}`}
                        onClick={() => requestSort("otherHero", setPairSynergySort, pairSynergySort)}
                      >
                        Partner Hero
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("otherHeroLane", pairSynergySort)}`}
                        onClick={() => requestSort("otherHeroLane", setPairSynergySort, pairSynergySort)}
                      >
                        Partner Lane
                        <span className="sort-indicator"></span>
                      </th>
                      {!isMobile && (
                        <th
                          className={`sortable ${getSortClass("heroLane", pairSynergySort)}`}
                          onClick={() => requestSort("heroLane", setPairSynergySort, pairSynergySort)}
                        >
                          {hero}'s Lane
                          <span className="sort-indicator"></span>
                        </th>
                      )}
                      <th
                        className={`sortable ${getSortClass("games", pairSynergySort)} text-right`}
                        onClick={() => requestSort("games", setPairSynergySort, pairSynergySort)}
                      >
                        Games
                        <span className="sort-indicator"></span>
                      </th>
                      {!isMobile && (
                        <th
                          className={`sortable ${getSortClass("wins", pairSynergySort)} text-right`}
                          onClick={() => requestSort("wins", setPairSynergySort, pairSynergySort)}
                        >
                          Wins
                          <span className="sort-indicator"></span>
                        </th>
                      )}
                      <th
                        className={`sortable ${getSortClass("winRate", pairSynergySort)} text-right`}
                        onClick={() => requestSort("winRate", setPairSynergySort, pairSynergySort)}
                      >
                        Win Rate
                        <span className="sort-indicator"></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHeroSynergies.map((synergy, index) => (
                      <tr key={index}>
                        <td>{synergy.otherHero}</td>
                        <td>{isMobile 
                          ? formatLaneName(synergy.otherHeroLane).split(' ')[0] 
                          : formatLaneName(synergy.otherHeroLane)}
                        </td>
                        {!isMobile && <td>{formatLaneName(synergy.heroLane)}</td>}
                        <td className="text-right">{synergy.games}</td>
                        {!isMobile && <td className="text-right">{synergy.wins}</td>}
                        <td className="text-right">{synergy.winRate}%</td>
                      </tr>
                    ))}
                    {sortedHeroSynergies.length === 0 && (
                      <tr>
                        <td colSpan={isMobile ? 4 : 6} style={{ textAlign: 'center', padding: '20px 0' }}>
                          No 2-hero synergy data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Triple Synergies Table */}
            {activeSynergyTab === "triples" && (
              <div style={tableContainerStyle}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th
                        className={`sortable ${getSortClass("otherHeroes", tripleSynergySort)}`}
                        onClick={() => requestSort("otherHeroes", setTripleSynergySort, tripleSynergySort)}
                      >
                        Other Heroes
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("games", tripleSynergySort)} text-right`}
                        onClick={() => requestSort("games", setTripleSynergySort, tripleSynergySort)}
                      >
                        Games
                        <span className="sort-indicator"></span>
                      </th>
                      {!isMobile && (
                        <th
                          className={`sortable ${getSortClass("wins", tripleSynergySort)} text-right`}
                          onClick={() => requestSort("wins", setTripleSynergySort, tripleSynergySort)}
                        >
                          Wins
                          <span className="sort-indicator"></span>
                        </th>
                      )}
                      <th
                        className={`sortable ${getSortClass("winRate", tripleSynergySort)} text-right`}
                        onClick={() => requestSort("winRate", setTripleSynergySort, tripleSynergySort)}
                      >
                        Win Rate
                        <span className="sort-indicator"></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTripleSynergies.map((synergy, index) => (
                      <tr key={index}>
                        <td>{renderMultiHeroNames(synergy.otherHeroes)}</td>
                        <td className="text-right">{synergy.games}</td>
                        {!isMobile && <td className="text-right">{synergy.wins}</td>}
                        <td className="text-right">{synergy.winRate}%</td>
                      </tr>
                    ))}
                    {sortedTripleSynergies.length === 0 && (
                      <tr>
                        <td colSpan={isMobile ? 3 : 4} style={{ textAlign: 'center', padding: '20px 0' }}>
                          No 3-hero synergy data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Quad Synergies Table */}
            {activeSynergyTab === "quads" && (
              <div style={tableContainerStyle}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th
                        className={`sortable ${getSortClass("otherHeroes", quadSynergySort)}`}
                        onClick={() => requestSort("otherHeroes", setQuadSynergySort, quadSynergySort)}
                      >
                        Other Heroes
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("games", quadSynergySort)} text-right`}
                        onClick={() => requestSort("games", setQuadSynergySort, quadSynergySort)}
                      >
                        Games
                        <span className="sort-indicator"></span>
                      </th>
                      {!isMobile && (
                        <th
                          className={`sortable ${getSortClass("wins", quadSynergySort)} text-right`}
                          onClick={() => requestSort("wins", setQuadSynergySort, quadSynergySort)}
                        >
                          Wins
                          <span className="sort-indicator"></span>
                        </th>
                      )}
                      <th
                        className={`sortable ${getSortClass("winRate", quadSynergySort)} text-right`}
                        onClick={() => requestSort("winRate", setQuadSynergySort, quadSynergySort)}
                      >
                        Win Rate
                        <span className="sort-indicator"></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedQuadSynergies.map((synergy, index) => (
                      <tr key={index}>
                        <td>{renderMultiHeroNames(synergy.otherHeroes)}</td>
                        <td className="text-right">{synergy.games}</td>
                        {!isMobile && <td className="text-right">{synergy.wins}</td>}
                        <td className="text-right">{synergy.winRate}%</td>
                      </tr>
                    ))}
                    {sortedQuadSynergies.length === 0 && (
                      <tr>
                        <td colSpan={isMobile ? 3 : 4} style={{ textAlign: 'center', padding: '20px 0' }}>
                          No 4-hero synergy data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="two-column-layout" style={{ marginTop: '20px' }}>
            {/* Good Against */}
            <div className="content-card">
              <h3 className="section-title">{hero} Counters These Heroes</h3>
              <div style={tableContainerStyle}>
                <table className="data-table-sm">
                  <thead>
                    <tr>
                      <th
                        className={`sortable ${getSortClass("against", goodAgainstSort)}`}
                        onClick={() => requestSort("against", setGoodAgainstSort, goodAgainstSort)}
                      >
                        Hero
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("againstLane", goodAgainstSort)}`}
                        onClick={() => requestSort("againstLane", setGoodAgainstSort, goodAgainstSort)}
                      >
                        Enemy Lane
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("games", goodAgainstSort)} text-right`}
                        onClick={() => requestSort("games", setGoodAgainstSort, goodAgainstSort)}
                      >
                        Games
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("winRate", goodAgainstSort)} text-right`}
                        onClick={() => requestSort("winRate", setGoodAgainstSort, goodAgainstSort)}
                      >
                        Win Rate
                        <span className="sort-indicator"></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGoodAgainst.slice(0, 10).map((counter, index) => (
                      <tr key={index}>
                        <td>{counter.against}</td>
                        <td>{isMobile 
                          ? formatLaneName(counter.againstLane).split(' ')[0] 
                          : formatLaneName(counter.againstLane)}
                        </td>
                        <td className="text-right">{counter.games}</td>
                        <td className="text-right">{counter.winRate}%</td>
                      </tr>
                    ))}
                    {sortedGoodAgainst.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px 0' }}>
                          No counter data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bad Against */}
            <div className="content-card">
              <h3 className="section-title">These Heroes Counter {hero}</h3>
              <div style={tableContainerStyle}>
                <table className="data-table-sm">
                  <thead>
                    <tr>
                      <th
                        className={`sortable ${getSortClass("pick", badAgainstSort)}`}
                        onClick={() => requestSort("pick", setBadAgainstSort, badAgainstSort)}
                      >
                        Hero
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("pickLane", badAgainstSort)}`}
                        onClick={() => requestSort("pickLane", setBadAgainstSort, badAgainstSort)}
                      >
                        Enemy Lane
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("games", badAgainstSort)} text-right`}
                        onClick={() => requestSort("games", setBadAgainstSort, badAgainstSort)}
                      >
                        Games
                        <span className="sort-indicator"></span>
                      </th>
                      <th
                        className={`sortable ${getSortClass("winRate", badAgainstSort)} text-right`}
                        onClick={() => requestSort("winRate", setBadAgainstSort, badAgainstSort)}
                      >
                        Win Rate
                        <span className="sort-indicator"></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBadAgainst.slice(0, 10).map((counter, index) => (
                      <tr key={index}>
                        <td>{counter.pick}</td>
                        <td>{isMobile 
                          ? formatLaneName(counter.pickLane).split(' ')[0] 
                          : formatLaneName(counter.pickLane)}
                        </td>
                        <td className="text-right">{counter.games}</td>
                        <td className="text-right">{counter.winRate}%</td>
                      </tr>
                    ))}
                    {sortedBadAgainst.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px 0' }}>
                          No counter data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroDetail;