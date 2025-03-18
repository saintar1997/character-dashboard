import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Papa from "papaparse";
import "./Dashboard.css";
import HeroDetail from "./HeroDetail";

const Dashboard = () => {
  // Keep all the existing state variables
  const [data, setData] = useState([]);
  const [characterStats, setCharacterStats] = useState({});
  const [laneStats, setLaneStats] = useState({});
  const [synergies, setSynergies] = useState([]);
  const [counters, setCounters] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedLane, setSelectedLane] = useState("dark");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStats, setFilteredStats] = useState({});
  const [overviewSortConfig, setOverviewSortConfig] = useState({ key: "pickCount", direction: "desc" });
  const [lanesSortConfig, setLanesSortConfig] = useState({ key: "pickCount", direction: "desc" });
  const [synergiesSortConfig, setSynergiesSortConfig] = useState({ key: "winRate", direction: "desc" });
  const [countersSortConfig, setCountersSortConfig] = useState({ key: "winRate", direction: "desc" });
  const [bansSortConfig, setBansSortConfig] = useState({ key: "banCount", direction: "desc" });

  const getActiveSortConfig = () => {
    switch (activeTab) {
      case "overview":
        return { config: overviewSortConfig, setConfig: setOverviewSortConfig };
      case "lanes":
        return { config: lanesSortConfig, setConfig: setLanesSortConfig };
      case "synergies":
        return { config: synergiesSortConfig, setConfig: setSynergiesSortConfig };
      case "counters":
        return { config: countersSortConfig, setConfig: setCountersSortConfig };
      case "bans":
        return { config: bansSortConfig, setConfig: setBansSortConfig };
      default:
        return { config: overviewSortConfig, setConfig: setOverviewSortConfig };
    }
  };

  // Add state for hero details modal
  const [selectedHero, setSelectedHero] = useState(null);

  // Add state for responsive design
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Add a new state for counter search mode
  const [counterSearchMode, setCounterSearchMode] = useState("pick"); // 'pick', 'against', or 'both'

  // Add new state for lane filtering
  const [laneFilterMode, setLaneFilterMode] = useState("none"); // 'none', 'pickLane', 'againstLane', or 'both'
  const [selectedLaneFilter, setSelectedLaneFilter] = useState("all"); // 'all', 'dark', 'farm', 'mid', 'abyssal', 'support'

  // Add state for synergy lane filtering
  const [synergyLaneFilterMode, setSynergyLaneFilterMode] = useState("none"); // 'none', 'char1Lane', 'char2Lane', 'either', 'both'
  const [selectedSynergyLaneFilter, setSelectedSynergyLaneFilter] =
    useState("all"); // 'all', 'dark', 'farm', 'mid', 'abyssal', 'support'


  // eslint-disable-next-line no-unused-vars
  // const [sortConfig, setSortConfig] = useState({
  //   key: "pickCount", 
  //   direction: "desc",
  // });

  // Function to split a comma-separated string into an array
  const splitCharacters = (str) => {
    if (!str) return [];
    return str.split(",").map((item) => item.trim());
  };

  // Analyze the game data
  const analyzeData = useCallback((games) => {
    const characterStats = {};
    const laneStats = {
      dark: {},
      farm: {},
      mid: {},
      abyssal: {},
      support: {},
    };

    games.forEach((game) => {
      const picks1 = splitCharacters(game.picks1);
      const picks2 = splitCharacters(game.picks2);
      const bans1 = splitCharacters(game.bans1);
      const bans2 = splitCharacters(game.bans2);

      const team1Won = game.winner === game.team1;
      const team2Won = game.winner === game.team2;

      // Process picks for team 1
      if (picks1.length === 5) {
        const lanePositions = ["dark", "farm", "mid", "abyssal", "support"];
        picks1.forEach((character, index) => {
          // Update general stats
          if (!characterStats[character]) {
            characterStats[character] = {
              pickCount: 0,
              winCount: 0,
              banCount: 0,
            };
          }
          characterStats[character].pickCount++;
          if (team1Won) characterStats[character].winCount++;

          // Update lane stats
          const lane = lanePositions[index];
          if (!laneStats[lane][character]) {
            laneStats[lane][character] = { pickCount: 0, winCount: 0 };
          }
          laneStats[lane][character].pickCount++;
          if (team1Won) laneStats[lane][character].winCount++;
        });
      }

      // Process picks for team 2
      if (picks2.length === 5) {
        const lanePositions = ["dark", "farm", "mid", "abyssal", "support"];
        picks2.forEach((character, index) => {
          // Update general stats
          if (!characterStats[character]) {
            characterStats[character] = {
              pickCount: 0,
              winCount: 0,
              banCount: 0,
            };
          }
          characterStats[character].pickCount++;
          if (team2Won) characterStats[character].winCount++;

          // Update lane stats
          const lane = lanePositions[index];
          if (!laneStats[lane][character]) {
            laneStats[lane][character] = { pickCount: 0, winCount: 0 };
          }
          laneStats[lane][character].pickCount++;
          if (team2Won) laneStats[lane][character].winCount++;
        });
      }

      // Process bans
      [...bans1, ...bans2].forEach((character) => {
        if (!character) return;
        if (!characterStats[character]) {
          characterStats[character] = {
            pickCount: 0,
            winCount: 0,
            banCount: 0,
          };
        }
        characterStats[character].banCount++;
      });
    });

    return { characterStats, laneStats };
  }, []);

  // Analyze character synergies
  const analyzeCharacterSynergies = useCallback((games) => {
    const pairStats = {};
    const lanePositions = ["dark", "farm", "mid", "abyssal", "support"];

    games.forEach((game) => {
      const picks1 = splitCharacters(game.picks1);
      const picks2 = splitCharacters(game.picks2);
      const team1Won = game.winner === game.team1;
      const team2Won = game.winner === game.team2;

      // Process team 1 pairs
      if (picks1.length >= 2) {
        for (let i = 0; i < picks1.length; i++) {
          const char1 = picks1[i];
          const lane1 = lanePositions[i];

          for (let j = i + 1; j < picks1.length; j++) {
            const char2 = picks1[j];
            const lane2 = lanePositions[j];

            // Create pair key with characters alphabetically sorted
            const charPair = [char1, char2].sort();
            const pair = charPair.join(" + ");

            // Store the lanes in the same order as the sorted characters
            const lane1Index = charPair.indexOf(char1);
            const lane2Index = charPair.indexOf(char2);
            const lanes = [];
            lanes[lane1Index] = lane1;
            lanes[lane2Index] = lane2;

            const pairKey = pair;

            if (!pairStats[pairKey]) {
              pairStats[pairKey] = {
                games: 0,
                wins: 0,
                char1: charPair[0],
                char2: charPair[1],
                lane1: lanes[0],
                lane2: lanes[1],
              };
            }

            pairStats[pairKey].games++;
            if (team1Won) pairStats[pairKey].wins++;
          }
        }
      }

      // Process team 2 pairs
      if (picks2.length >= 2) {
        for (let i = 0; i < picks2.length; i++) {
          const char1 = picks2[i];
          const lane1 = lanePositions[i];

          for (let j = i + 1; j < picks2.length; j++) {
            const char2 = picks2[j];
            const lane2 = lanePositions[j];

            // Create pair key with characters alphabetically sorted
            const charPair = [char1, char2].sort();
            const pair = charPair.join(" + ");

            // Store the lanes in the same order as the sorted characters
            const lane1Index = charPair.indexOf(char1);
            const lane2Index = charPair.indexOf(char2);
            const lanes = [];
            lanes[lane1Index] = lane1;
            lanes[lane2Index] = lane2;

            const pairKey = pair;

            if (!pairStats[pairKey]) {
              pairStats[pairKey] = {
                games: 0,
                wins: 0,
                char1: charPair[0],
                char2: charPair[1],
                lane1: lanes[0],
                lane2: lanes[1],
              };
            }

            pairStats[pairKey].games++;
            if (team2Won) pairStats[pairKey].wins++;
          }
        }
      }
    });

    const pairRankings = Object.entries(pairStats)
      .map(([pair, stats]) => {
        const winRate = (stats.wins / stats.games) * 100;
        return {
          pair,
          char1: stats.char1,
          char2: stats.char2,
          lane1: stats.lane1,
          lane2: stats.lane2,
          games: stats.games,
          wins: stats.wins,
          winRate: winRate.toFixed(2),
        };
      })
      .filter((pair) => pair.games >= 3)
      .sort((a, b) => b.winRate - a.winRate);

    return pairRankings;
  }, []);

  // Analyze counter picks - updated to include lane information
  const analyzeCounterPicks = useCallback((games) => {
    const matchups = {};
    const lanePositions = ["dark", "farm", "mid", "abyssal", "support"];

    games.forEach((game) => {
      const picks1 = splitCharacters(game.picks1);
      const picks2 = splitCharacters(game.picks2);
      const team1Won = game.winner === game.team1;

      picks1.forEach((char1, index1) => {
        const lane1 = lanePositions[index1];

        picks2.forEach((char2, index2) => {
          const lane2 = lanePositions[index2];
          const matchupKey = `${char1} vs ${char2}`;

          if (!matchups[matchupKey]) {
            matchups[matchupKey] = {
              games: 0,
              wins: 0,
              pickLane: lane1,
              againstLane: lane2,
            };
          }

          matchups[matchupKey].games++;
          if (team1Won) matchups[matchupKey].wins++;
        });
      });

      picks2.forEach((char2, index2) => {
        const lane2 = lanePositions[index2];

        picks1.forEach((char1, index1) => {
          const lane1 = lanePositions[index1];
          const matchupKey = `${char2} vs ${char1}`;

          if (!matchups[matchupKey]) {
            matchups[matchupKey] = {
              games: 0,
              wins: 0,
              pickLane: lane2,
              againstLane: lane1,
            };
          }

          matchups[matchupKey].games++;
          if (!team1Won) matchups[matchupKey].wins++;
        });
      });
    });

    const matchupRankings = Object.entries(matchups)
      .map(([matchup, stats]) => {
        const winRate = (stats.wins / stats.games) * 100;
        return {
          matchup,
          games: stats.games,
          wins: stats.wins,
          winRate: winRate.toFixed(2),
          pickLane: stats.pickLane,
          againstLane: stats.againstLane,
        };
      })
      .filter((m) => m.games >= 3)
      .sort((a, b) => b.winRate - a.winRate);

    return matchupRankings;
  }, []);

  // Handler for clicking on a hero name
  const handleHeroClick = (heroName) => {
    setSelectedHero(heroName);
  };

  // Handler for closing the hero detail modal
  const handleHeroDetailClose = () => {
    setSelectedHero(null);
  };

  // Listen for window resize to detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    // Initial check
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    // Load the CSV file
    const fetchData = async () => {
      try {
        // As a last resort (not ideal but will work)
        const response = await fetch(
          "https://saintar1997.github.io/character-dashboard/Game_History.csv"
        );
        const csvText = await response.text();

        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });

        setData(result.data);

        // Process all the data
        const { characterStats, laneStats } = analyzeData(result.data);
        setCharacterStats(characterStats);
        setFilteredStats(characterStats); // Initialize filtered stats with all stats
        setLaneStats(laneStats);

        // Process synergies
        const synergies = analyzeCharacterSynergies(result.data);
        setSynergies(synergies);

        // Process counter picks
        const counters = analyzeCounterPicks(result.data);
        setCounters(counters);

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [analyzeData, analyzeCharacterSynergies, analyzeCounterPicks]); // เพิ่ม dependencies ตรงนี้

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStats(characterStats);
      return;
    }

    const query = searchQuery.toLowerCase();

    // Filter character stats
    const filtered = Object.entries(characterStats)
      .filter(([character]) => character.toLowerCase().includes(query))
      .reduce((obj, [character, stats]) => {
        obj[character] = stats;
        return obj;
      }, {});

    setFilteredStats(filtered);
  }, [searchQuery, characterStats]);

  useEffect(() => {
  //   // กำหนด config เริ่มต้นสำหรับแต่ละแท็บ
  //   // const defaultConfigs = {
  //   //   overview: { key: "pickCount", direction: "desc" },
  //   //   lanes: { key: "pickCount", direction: "desc" },
  //   //   synergies: { key: "winRate", direction: "desc" },
  //   //   counters: { key: "winRate", direction: "desc" },
  //   //   bans: { key: "banCount", direction: "desc" },
  //   // };

  //   // // อัปเดต sortConfig เมื่อเปลี่ยนแท็บ
  //   // setSortConfig(
  //   //   defaultConfigs[activeTab] || { key: "pickCount", direction: "desc" }
  //   // );
  }, [activeTab]);

  // Request a sort
  const requestSort = (key) => {
    if (!key) return;
    
    try {
      const { config, setConfig } = getActiveSortConfig();
      
      let direction = "asc";
      if (config.key === key && config.direction === "asc") {
        direction = "desc";
      }
      
      setConfig({ key, direction });
    } catch (error) {
      console.error("Error in requestSort:", error);
    }
  };

  // ฟังก์ชันช่วยในการแปลงค่าให้เป็นตัวเลขสำหรับการเรียงลำดับ
  const getValueForSort = (value) => {
    // ป้องกันกรณี value เป็น undefined หรือ null
    if (value === undefined || value === null) return 0;

    // ถ้าเป็นค่าเปอร์เซ็นต์ (เช่น "9.00%" หรือ "80.52%")
    if (typeof value === "string" && value.includes("%")) {
      return parseFloat(value.replace("%", ""));
    }

    // ถ้าเป็นค่า string ที่ควรเป็นตัวเลข (แต่ไม่มีเครื่องหมาย %)
    if (typeof value === "string" && !isNaN(value)) {
      return parseFloat(value);
    }

    // กรณีอื่นๆ ให้ใช้ค่าเดิม
    return value;
  };

  // แก้ไขฟังก์ชัน getSortedCharacterStats
  const getSortedCharacterStats = () => {
    try {
      const { config } = getActiveSortConfig();
      
      // ต่อจากนี้คือโค้ดเดิม แต่ใช้ config แทน sortConfig
      if (!filteredStats || Object.keys(filteredStats).length === 0) return [];
      
      const statsArray = Object.entries(filteredStats).map(
        ([character, stats]) => {
          if (!stats) return null;
          
          const winRate =
            stats.pickCount > 0
              ? ((stats.winCount / stats.pickCount) * 100).toFixed(2)
              : 0;
          const totalGames = data?.length || 0;
          const banRate = ((stats.banCount / (totalGames * 2)) * 100).toFixed(2);
    
          return {
            character,
            pickCount: stats.pickCount,
            winCount: stats.winCount,
            winRate,
            banCount: stats.banCount,
            banRate,
          };
        }
      ).filter(Boolean);
    
      return statsArray.sort((a, b) => {
        if (!a || !b || !config || !config.key) return 0;
        
        // ตรวจสอบว่า key มีอยู่ใน object หรือไม่
        if (!(config.key in a) || !(config.key in b)) return 0;
        
        const aValue = getValueForSort(a[config.key]);
        const bValue = getValueForSort(b[config.key]);
    
        if (aValue < bValue) {
          return config.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return config.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } catch (error) {
      console.error("Error in getSortedCharacterStats:", error);
      return [];
    }
  };
  
  // แก้ไขฟังก์ชัน getSortedLaneCharacters
  const getSortedLaneCharacters = (lane) => {
    try {
      const { config } = getActiveSortConfig();

      const filteredLaneCharacters = Object.entries(laneStats[lane])
        .filter(([character]) => {
          if (!searchQuery || !searchQuery.trim()) return true;
          return character.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .map(([character, stats]) => {
          if (!stats) return null; // ป้องกันกรณี stats เป็น undefined

          const winRate =
            stats.pickCount > 0
              ? ((stats.winCount / stats.pickCount) * 100).toFixed(2)
              : 0;
          return {
            character,
            pickCount: stats.pickCount,
            winCount: stats.winCount,
            winRate,
          };
        })
        .filter(Boolean) // กรอง null ออก
        .filter((char) => char.pickCount >= 3);

      return filteredLaneCharacters.sort((a, b) => {
        if (!a || !b || !config || !config.key) return 0;

        // ตรวจสอบว่า key มีอยู่ใน object หรือไม่
        if (!(config.key in a) || !(config.key in b)) return 0;

        const aValue = getValueForSort(a[config.key]);
        const bValue = getValueForSort(b[config.key]);

        if (aValue < bValue) {
          return config.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return config.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } catch (error) {
      console.error("Error in getSortedLaneCharacters:", error);
      return [];
    }
  };

  // แก้ไขฟังก์ชัน getSortedSynergies
  const getSortedSynergies = () => {
    try {
      // รับ config จากแท็บปัจจุบัน
      const { config } = getActiveSortConfig();
      
      // ป้องกันกรณี synergies เป็น null หรือ undefined
      if (!synergies) return [];
      
      // กำหนดค่าเริ่มต้นให้ filteredSynergies - นี่คือส่วนที่ขาดหายไป
      let filteredSynergies = [...synergies];
      
      // Apply search query filter if provided
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredSynergies = filteredSynergies.filter((synergy) =>
          synergy.pair.toLowerCase().includes(query)
        );
      }
  
      // Apply lane filter if selected
      if (
        selectedSynergyLaneFilter !== "all" &&
        synergyLaneFilterMode !== "none"
      ) {
        switch (synergyLaneFilterMode) {
          case "char1Lane":
            // Filter to only show results where the first character's lane matches
            filteredSynergies = filteredSynergies.filter(
              (synergy) => synergy.lane1 === selectedSynergyLaneFilter
            );
            break;
          case "char2Lane":
            // Filter to only show results where the second character's lane matches
            filteredSynergies = filteredSynergies.filter(
              (synergy) => synergy.lane2 === selectedSynergyLaneFilter
            );
            break;
          case "either":
            // Filter to show results where either lane matches
            filteredSynergies = filteredSynergies.filter(
              (synergy) =>
                synergy.lane1 === selectedSynergyLaneFilter ||
                synergy.lane2 === selectedSynergyLaneFilter
            );
            break;
          case "both":
            // Filter to show specific lane combinations
            filteredSynergies = filteredSynergies.filter((synergy) => {
              const hasLane1 = synergy.lane1 === selectedSynergyLaneFilter;
              const hasLane2 = synergy.lane2 === selectedSynergyLaneFilter;
              return hasLane1 && hasLane2;
            });
            break;
          default:
          // No lane filtering if mode is 'none'
        }
      }
  
      // Sort based on the current sort config
      return filteredSynergies.sort((a, b) => {
        // ป้องกันกรณี a หรือ b เป็น null หรือไม่มี key ที่ต้องการ
        if (!a || !b || !config || !config.key) return 0;
        
        // ตรวจสอบว่ามี key ใน object หรือไม่
        if (!(config.key in a) || !(config.key in b)) return 0;
        
        const aValue = getValueForSort(a[config.key]);
        const bValue = getValueForSort(b[config.key]);
  
        if (aValue < bValue) {
          return config.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return config.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } catch (error) {
      console.error("Error in getSortedSynergies:", error);
      return []; // ถ้าเกิด error ให้คืนค่า array ว่าง
    }
  };

  // แก้ไขฟังก์ชัน getSortedCounters
  const getSortedCounters = () => {
    try {
      const { config } = getActiveSortConfig();

      const processedCounters = counters
        .map((counter) => {
          if (!counter || !counter.matchup) return null;

          const parts = counter.matchup.split(" vs ");
          const pick = parts[0] || "";
          const against = parts[1] || "";

          return {
            ...counter,
            pick,
            against,
          };
        })
        .filter(Boolean); // กรอง null ออก

      let filteredCounters = processedCounters;

      // Apply search query filter if provided
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();

        switch (counterSearchMode) {
          case "pick":
            // Filter to only show results where "Pick This" matches search
            filteredCounters = filteredCounters.filter((counter) =>
              counter.pick.toLowerCase().includes(query)
            );
            break;
          case "against":
            // Filter to only show results where "Against" matches search
            filteredCounters = filteredCounters.filter((counter) =>
              counter.against.toLowerCase().includes(query)
            );
            break;
          case "both":
            // Filter to show results where either column matches (original behavior)
            filteredCounters = filteredCounters.filter(
              (counter) =>
                counter.pick.toLowerCase().includes(query) ||
                counter.against.toLowerCase().includes(query)
            );
            break;
          default:
          // No filtering
        }
      }

      // Apply lane filter if selected
      if (selectedLaneFilter !== "all" && laneFilterMode !== "none") {
        switch (laneFilterMode) {
          case "pickLane":
            // Filter to only show results where the pick lane matches
            filteredCounters = filteredCounters.filter(
              (counter) => counter.pickLane === selectedLaneFilter
            );
            break;
          case "againstLane":
            // Filter to only show results where the against lane matches
            filteredCounters = filteredCounters.filter(
              (counter) => counter.againstLane === selectedLaneFilter
            );
            break;
          case "both":
            // Filter to show results where both lanes match
            filteredCounters = filteredCounters.filter(
              (counter) =>
                counter.pickLane === selectedLaneFilter &&
                counter.againstLane === selectedLaneFilter
            );
            break;
          case "either":
            // Filter to show results where either lane matches
            filteredCounters = filteredCounters.filter(
              (counter) =>
                counter.pickLane === selectedLaneFilter ||
                counter.againstLane === selectedLaneFilter
            );
            break;
          default:
          // No lane filtering if mode is 'none'
        }
      }

      // Sort based on the current sort config
      return filteredCounters.sort((a, b) => {
        if (!a || !b || !config || !config.key) return 0;

        // ตรวจสอบว่า key มีอยู่ใน object หรือไม่
        if (!(config.key in a) || !(config.key in b)) return 0;

        const aValue = getValueForSort(a[config.key]);
        const bValue = getValueForSort(b[config.key]);

        if (aValue < bValue) {
          return config.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return config.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } catch (error) {
      console.error("Error in getSortedCounters:", error);
      return [];
    }
  };

  // Get sort class for a column header
  const getSortClass = (key) => {
    try {
      if (!key) return "";
      
      const { config } = getActiveSortConfig();
      
      if (config.key === key) {
        return config.direction === "asc" ? "sort-asc" : "sort-desc";
      }
      return "";
    } catch (error) {
      console.error("Error in getSortClass:", error);
      return "";
    }
  };

  // Style adjustments for responsive design
  const searchModeStyle = {
    marginLeft: isMobile ? "0" : "10px",
    marginTop: isMobile ? "10px" : "0",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "flex-start" : "center",
    width: isMobile ? "100%" : "auto",
  };

  const radioLabelStyle = {
    marginRight: isMobile ? "0" : "15px",
    marginBottom: isMobile ? "8px" : "0",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    width: isMobile ? "100%" : "auto",
  };

  const radioInputStyle = {
    marginRight: "5px",
    cursor: "pointer",
  };

  // Function to create table containers with horizontal scrolling for mobile
  const renderTableContainer = (tableContent) => {
    return <div className="data-table-container">{tableContent}</div>;
  };

  // Get top characters by pick rate for chart
  const getTopByPickRate = (limit = 10) => {
    const totalGames = data.length;
    return Object.entries(filteredStats)
      .map(([character, stats]) => ({
        name: character,
        pickRate: ((stats.pickCount / (totalGames * 2)) * 100).toFixed(2),
        pickCount: stats.pickCount,
      }))
      .sort((a, b) => b.pickCount - a.pickCount)
      .slice(0, limit);
  };

  // Get top banned characters for chart
  const getTopByBanRate = (limit = 10) => {
    const totalGames = data.length;
    return Object.entries(filteredStats)
      .map(([character, stats]) => ({
        name: character,
        banRate: ((stats.banCount / (totalGames * 2)) * 100).toFixed(2),
        banCount: stats.banCount,
      }))
      .sort((a, b) => b.banCount - a.banCount)
      .slice(0, limit);
  };

  // Get top characters for a specific lane for chart
  const getLaneCharacters = (
    lane,
    sortBy = "winRate",
    minGames = 3,
    limit = 10
  ) => {
    if (!laneStats[lane]) return [];

    // Filter lane characters based on search query
    const filteredLaneCharacters = Object.entries(laneStats[lane])
      .filter(([character]) => {
        if (!searchQuery.trim()) return true;
        return character.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .map(([character, stats]) => {
        const winRate =
          stats.pickCount > 0
            ? ((stats.winCount / stats.pickCount) * 100).toFixed(2)
            : 0;
        return {
          name: character,
          pickCount: stats.pickCount,
          winCount: stats.winCount,
          winRate: winRate,
        };
      })
      .filter((char) => char.pickCount >= minGames)
      .sort((a, b) =>
        sortBy === "winRate" ? b.winRate - a.winRate : b.pickCount - a.pickCount
      );

    return filteredLaneCharacters.slice(0, limit);
  };

  // Format lane name for display
  const formatLaneName = (lane) => {
    switch (lane) {
      case "dark":
        return "Dark Lane";
      case "farm":
        return "Farm Lane";
      case "mid":
        return "Mid Lane";
      case "abyssal":
        return "Abyssal Lane";
      case "support":
        return "Support Lane";
      default:
        return lane;
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Highlight search term in text
  const highlightText = (text) => {
    if (!searchQuery.trim()) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));

    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <span key={index} className="highlight">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Create clickable hero name
  const renderHeroName = (heroName) => {
    return (
      <span
        className="hero-name-link"
        onClick={() => handleHeroClick(heroName)}
      >
        {highlightText(heroName)}
      </span>
    );
  };

  // Filter controls style for responsive design
  const filterControlsStyle = {
    marginBottom: "15px",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    flexWrap: isMobile ? "nowrap" : "wrap",
    alignItems: isMobile ? "flex-start" : "center",
    width: "100%",
  };

  const filterGroupStyle = {
    marginRight: isMobile ? "0" : "20px",
    marginBottom: isMobile ? "10px" : "0",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "flex-start" : "center",
    width: isMobile ? "100%" : "auto",
  };

  const selectStyle = {
    padding: "6px 12px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    width: isMobile ? "100%" : "auto",
    marginTop: isMobile ? "5px" : "0",
  };

  if (loading) {
    return <div className="dashboard-container">Loading data...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Character Selection Dashboard</h1>
        <p>Based on analysis of {data.length} games</p>
      </div>

      {/* Global Search Bar - shown on all tabs except counters */}
      {activeTab !== "counters" && (
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search for a hero..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button className="search-button" onClick={clearSearch}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* Custom Search Bar for Counter Picks tab */}
      {activeTab === "counters" && (
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder={
              counterSearchMode === "pick"
                ? "Search for a hero to pick..."
                : counterSearchMode === "against"
                ? "Search for a hero to counter..."
                : "Search for any hero..."
            }
            value={searchQuery}
            onChange={handleSearchChange}
          />

          <div style={searchModeStyle} className="search-modes">
            <label style={radioLabelStyle} className="radio-label">
              <input
                type="radio"
                name="counterSearchMode"
                value="pick"
                checked={counterSearchMode === "pick"}
                onChange={() => setCounterSearchMode("pick")}
                style={radioInputStyle}
              />
              Search "Pick This" column
            </label>

            <label style={radioLabelStyle} className="radio-label">
              <input
                type="radio"
                name="counterSearchMode"
                value="against"
                checked={counterSearchMode === "against"}
                onChange={() => setCounterSearchMode("against")}
                style={radioInputStyle}
              />
              Search "Against" column
            </label>

            <label style={radioLabelStyle} className="radio-label">
              <input
                type="radio"
                name="counterSearchMode"
                value="both"
                checked={counterSearchMode === "both"}
                onChange={() => setCounterSearchMode("both")}
                style={radioInputStyle}
              />
              Search both columns
            </label>
          </div>

          {searchQuery && (
            <button className="search-button" onClick={clearSearch}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* Search Results Summary */}
      {searchQuery && activeTab !== "counters" && (
        <div className="search-results">
          Found {Object.keys(filteredStats).length} characters matching "
          {searchQuery}"
        </div>
      )}

      {/* Counter Picks Search Results Summary */}
      {searchQuery && activeTab === "counters" && (
        <div className="search-results">
          Found {getSortedCounters().length} matchups where
          {counterSearchMode === "pick"
            ? ' "Pick This" '
            : counterSearchMode === "against"
            ? ' "Against" '
            : " either column "}
          includes "{searchQuery}"
          {laneFilterMode !== "none" && selectedLaneFilter !== "all" && (
            <span>
              {" "}
              and{" "}
              {laneFilterMode === "pickLane"
                ? '"Pick Lane"'
                : laneFilterMode === "againstLane"
                ? '"Against Lane"'
                : "either lane"}{" "}
              is {formatLaneName(selectedLaneFilter)}
            </span>
          )}
        </div>
      )}

      {/* Main Tabs */}
      <div className="tabs">
        <div
          className={`tab ${activeTab === "overview" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </div>
        <div
          className={`tab ${activeTab === "lanes" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("lanes")}
        >
          Lane Analysis
        </div>
        <div
          className={`tab ${activeTab === "synergies" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("synergies")}
        >
          Character Synergies
        </div>
        <div
          className={`tab ${activeTab === "counters" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("counters")}
        >
          Counter Picks
        </div>
        <div
          className={`tab ${activeTab === "bans" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("bans")}
        >
          Ban Strategy
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="content-card">
          <h2 className="section-title">Top Characters by Pick Rate</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getTopByPickRate()}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={isMobile ? { fontSize: 10 } : {}}
                />
                <YAxis
                  label={
                    isMobile
                      ? null
                      : {
                          value: "Pick Rate (%)",
                          angle: -90,
                          position: "insideLeft",
                        }
                  }
                />
                <Tooltip formatter={(value) => [`${value}%`, "Pick Rate"]} />
                <Bar dataKey="pickRate" fill="#8884d8" name="Pick Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3 className="section-title">Character Statistics</h3>
          {renderTableContainer(
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`sortable ${getSortClass("character")}`}
                    onClick={() => requestSort("character")}
                  >
                    Character
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass(
                      "pickCount"
                    )} text-right`}
                    onClick={() => requestSort("pickCount")}
                  >
                    Pick Count
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass(
                      "winCount"
                    )} text-right`}
                    onClick={() => requestSort("winCount")}
                  >
                    Win Count
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass("winRate")} text-right`}
                    onClick={() => requestSort("winRate")}
                  >
                    Win Rate
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass(
                      "banCount"
                    )} text-right`}
                    onClick={() => requestSort("banCount")}
                  >
                    Ban Count
                    <span className="sort-indicator"></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedCharacterStats().map((char) => (
                  <tr key={char.character}>
                    <td>{renderHeroName(char.character)}</td>
                    <td className="text-right">{char.pickCount}</td>
                    <td className="text-right">{char.winCount}</td>
                    <td className="text-right">{char.winRate}%</td>
                    <td className="text-right">{char.banCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Lane Analysis Tab */}
      {activeTab === "lanes" && (
        <div className="content-card">
          <h2 className="section-title">Lane Performance Analysis</h2>

          {/* Lane Selector Tabs */}
          <div className="lane-tabs">
            <div
              className={`lane-tab ${
                selectedLane === "dark" ? "lane-tab-active" : ""
              }`}
              onClick={() => setSelectedLane("dark")}
            >
              Dark Lane
            </div>
            <div
              className={`lane-tab ${
                selectedLane === "farm" ? "lane-tab-active" : ""
              }`}
              onClick={() => setSelectedLane("farm")}
            >
              Farm Lane
            </div>
            <div
              className={`lane-tab ${
                selectedLane === "mid" ? "lane-tab-active" : ""
              }`}
              onClick={() => setSelectedLane("mid")}
            >
              Mid Lane
            </div>
            <div
              className={`lane-tab ${
                selectedLane === "abyssal" ? "lane-tab-active" : ""
              }`}
              onClick={() => setSelectedLane("abyssal")}
            >
              Abyssal Lane
            </div>
            <div
              className={`lane-tab ${
                selectedLane === "support" ? "lane-tab-active" : ""
              }`}
              onClick={() => setSelectedLane("support")}
            >
              Support Lane
            </div>
          </div>

          <h3 className="section-title">
            Top Characters for {formatLaneName(selectedLane)}
          </h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getLaneCharacters(selectedLane, "winRate").map(
                  (char) => ({
                    name: char.name,
                    winRate: char.winRate,
                    games: char.pickCount,
                  })
                )}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={isMobile ? { fontSize: 10 } : {}}
                />
                <YAxis
                  label={
                    isMobile
                      ? null
                      : {
                          value: "Win Rate (%)",
                          angle: -90,
                          position: "insideLeft",
                        }
                  }
                />
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value}% (${props.payload.games} games)`,
                    "Win Rate",
                  ]}
                />
                <Bar dataKey="winRate" fill="#82ca9d" name="Win Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {renderTableContainer(
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`sortable ${getSortClass("character")}`}
                    onClick={() => requestSort("character")}
                  >
                    Character
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass(
                      "pickCount"
                    )} text-right`}
                    onClick={() => requestSort("pickCount")}
                  >
                    Pick Count
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass(
                      "winCount"
                    )} text-right`}
                    onClick={() => requestSort("winCount")}
                  >
                    Win Count
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass("winRate")} text-right`}
                    onClick={() => requestSort("winRate")}
                  >
                    Win Rate
                    <span className="sort-indicator"></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedLaneCharacters(selectedLane).map((char) => (
                  <tr key={char.character}>
                    <td>{renderHeroName(char.character)}</td>
                    <td className="text-right">{char.pickCount}</td>
                    <td className="text-right">{char.winCount}</td>
                    <td className="text-right">{char.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Character Synergies Tab */}
      {activeTab === "synergies" && (
        <div className="content-card">
          <h2 className="section-title">
            Character Synergies (Pairs with High Win Rates)
          </h2>

          {/* Lane Filter Controls for Synergies - updated for responsive design */}
          <div style={filterControlsStyle} className="filter-controls">
            <div style={filterGroupStyle} className="filter-control-group">
              <label
                style={{
                  marginRight: isMobile ? "0" : "10px",
                  marginBottom: isMobile ? "5px" : "0",
                  fontWeight: "bold",
                }}
              >
                Lane Filter:
              </label>
              <select
                value={synergyLaneFilterMode}
                onChange={(e) => setSynergyLaneFilterMode(e.target.value)}
                style={selectStyle}
              >
                <option value="none">All Lane</option>
                <option value="char1Lane">
                  Filter by First Character Lane
                </option>
                <option value="char2Lane">
                  Filter by Second Character Lane
                </option>
                <option value="either">Filter by Either Lane</option>
              </select>
            </div>

            {synergyLaneFilterMode !== "none" && (
              <div style={filterGroupStyle} className="filter-control-group">
                <label
                  style={{
                    marginRight: isMobile ? "0" : "10px",
                    marginBottom: isMobile ? "5px" : "0",
                    fontWeight: "bold",
                  }}
                >
                  Select Lane:
                </label>
                <select
                  value={selectedSynergyLaneFilter}
                  onChange={(e) => setSelectedSynergyLaneFilter(e.target.value)}
                  style={selectStyle}
                >
                  <option value="all">All Lanes</option>
                  <option value="dark">Dark Lane</option>
                  <option value="farm">Farm Lane</option>
                  <option value="mid">Mid Lane</option>
                  <option value="abyssal">Abyssal Lane</option>
                  <option value="support">Support Lane</option>
                </select>
              </div>
            )}
          </div>

          {/* Display search results count with lane filter info */}
          {searchQuery && (
            <div className="search-results">
              Found {getSortedSynergies().length} synergies matching "
              {searchQuery}"
              {synergyLaneFilterMode !== "none" &&
                selectedSynergyLaneFilter !== "all" && (
                  <span>
                    {" "}
                    and{" "}
                    {synergyLaneFilterMode === "char1Lane"
                      ? "first character lane"
                      : synergyLaneFilterMode === "char2Lane"
                      ? "second character lane"
                      : synergyLaneFilterMode === "both"
                      ? "both characters in same lane"
                      : "either character lane"}{" "}
                    is {formatLaneName(selectedSynergyLaneFilter)}
                  </span>
                )}
            </div>
          )}

          <div style={{ overflowY: "auto", maxHeight: "500px" }}>
            {renderTableContainer(
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      className={`sortable ${getSortClass("pair")}`}
                      onClick={() => requestSort("pair")}
                    >
                      Character Pair
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass("lane1")}`}
                      onClick={() => requestSort("lane1")}
                    >
                      First Lane
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass("lane2")}`}
                      onClick={() => requestSort("lane2")}
                    >
                      Second Lane
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass("games")} text-right`}
                      onClick={() => requestSort("games")}
                    >
                      Games
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass("wins")} text-right`}
                      onClick={() => requestSort("wins")}
                    >
                      Wins
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass(
                        "winRate"
                      )} text-right`}
                      onClick={() => requestSort("winRate")}
                    >
                      Win Rate
                      <span className="sort-indicator"></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedSynergies()
                    .filter((pair) => pair.games >= 3)
                    .map((pair, index) => {
                      const char1 = pair.char1;
                      const char2 = pair.char2;

                      return (
                        <tr key={index}>
                          <td>
                            <span
                              className="hero-name-link"
                              onClick={() => handleHeroClick(char1)}
                            >
                              {highlightText(char1)}
                            </span>
                            {" + "}
                            <span
                              className="hero-name-link"
                              onClick={() => handleHeroClick(char2)}
                            >
                              {highlightText(char2)}
                            </span>
                          </td>
                          <td>
                            {isMobile
                              ? formatLaneName(pair.lane1).split(" ")[0]
                              : formatLaneName(pair.lane1)}
                          </td>
                          <td>
                            {isMobile
                              ? formatLaneName(pair.lane2).split(" ")[0]
                              : formatLaneName(pair.lane2)}
                          </td>
                          <td className="text-right">{pair.games}</td>
                          <td className="text-right">{pair.wins}</td>
                          <td className="text-right">{pair.winRate}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>

          <div className="chart-container" style={{ marginTop: "20px" }}>
            <h3 className="section-title">Top Synergies by Win Rate</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getSortedSynergies()
                  .filter((pair) => pair.games >= 5)
                  .slice(0, 10)
                  .map((pair) => ({
                    name: pair.pair,
                    winRate: pair.winRate,
                    games: pair.games,
                  }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={isMobile ? { fontSize: 10 } : {}}
                />
                <YAxis
                  label={
                    isMobile
                      ? null
                      : {
                          value: "Win Rate (%)",
                          angle: -90,
                          position: "insideLeft",
                        }
                  }
                />
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value}% (${props.payload.games} games)`,
                    "Win Rate",
                  ]}
                />
                <Bar dataKey="winRate" fill="#8884d8" name="Win Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Add a section for lane-specific synergies */}
          <div style={{ marginTop: "20px" }}>
            <h3 className="section-title">Strong Lane Synergies</h3>
            <div className="two-column-layout">
              {/* First Column: Support + Carry Lane Synergies */}
              <div className="content-card">
                <h4 className="section-title">Support + Farm Lane Duos</h4>
                {renderTableContainer(
                  <table className="data-table-sm">
                    <thead>
                      <tr>
                        <th>Support</th>
                        <th>Farm Lane</th>
                        <th className="text-right">Games</th>
                        <th className="text-right">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedSynergies()
                        .filter(
                          (pair) =>
                            (pair.lane1 === "support" &&
                              pair.lane2 === "farm") ||
                            (pair.lane1 === "farm" && pair.lane2 === "support")
                        )
                        .filter((pair) => pair.games >= 3)
                        .slice(0, 10)
                        .map((pair, index) => {
                          // Determine which character is support and which is farm
                          const supportChar =
                            pair.lane1 === "support" ? pair.char1 : pair.char2;
                          const farmChar =
                            pair.lane1 === "farm" ? pair.char1 : pair.char2;

                          return (
                            <tr key={index}>
                              <td>
                                <span
                                  className="hero-name-link"
                                  onClick={() => handleHeroClick(supportChar)}
                                >
                                  {supportChar}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="hero-name-link"
                                  onClick={() => handleHeroClick(farmChar)}
                                >
                                  {farmChar}
                                </span>
                              </td>
                              <td className="text-right">{pair.games}</td>
                              <td className="text-right">{pair.winRate}%</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Second Column: Mid + Dark Lane Synergies */}
              <div className="content-card">
                <h4 className="section-title">Mid + Dark Lane Duos</h4>
                {renderTableContainer(
                  <table className="data-table-sm">
                    <thead>
                      <tr>
                        <th>Mid Lane</th>
                        <th>Dark Lane</th>
                        <th className="text-right">Games</th>
                        <th className="text-right">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedSynergies()
                        .filter(
                          (pair) =>
                            (pair.lane1 === "mid" && pair.lane2 === "dark") ||
                            (pair.lane1 === "dark" && pair.lane2 === "mid")
                        )
                        .filter((pair) => pair.games >= 3)
                        .slice(0, 10)
                        .map((pair, index) => {
                          // Determine which character is mid and which is dark
                          const midChar =
                            pair.lane1 === "mid" ? pair.char1 : pair.char2;
                          const darkChar =
                            pair.lane1 === "dark" ? pair.char1 : pair.char2;

                          return (
                            <tr key={index}>
                              <td>
                                <span
                                  className="hero-name-link"
                                  onClick={() => handleHeroClick(midChar)}
                                >
                                  {midChar}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="hero-name-link"
                                  onClick={() => handleHeroClick(darkChar)}
                                >
                                  {darkChar}
                                </span>
                              </td>
                              <td className="text-right">{pair.games}</td>
                              <td className="text-right">{pair.winRate}%</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Counter Picks Tab - Updated with clickable hero names */}
      {activeTab === "counters" && (
        <div className="content-card">
          <h2 className="section-title">
            Counter Picks (Characters that Win Against Specific Opponents)
          </h2>

          {/* Lane Filter Controls - updated for responsive design */}
          <div style={filterControlsStyle} className="filter-controls">
            <div style={filterGroupStyle} className="filter-control-group">
              <label
                style={{
                  marginRight: isMobile ? "0" : "10px",
                  marginBottom: isMobile ? "5px" : "0",
                  fontWeight: "bold",
                }}
              >
                Lane Filter:
              </label>
              <select
                value={laneFilterMode}
                onChange={(e) => setLaneFilterMode(e.target.value)}
                style={selectStyle}
              >
                <option value="none">No Lane Filter</option>
                <option value="pickLane">Filter by Pick Lane</option>
                <option value="againstLane">Filter by Against Lane</option>
                <option value="both">Filter by Both Lane</option>
                <option value="either">Filter by Either Lane</option>
              </select>
            </div>

            {laneFilterMode !== "none" && (
              <div style={filterGroupStyle} className="filter-control-group">
                <label
                  style={{
                    marginRight: isMobile ? "0" : "10px",
                    marginBottom: isMobile ? "5px" : "0",
                    fontWeight: "bold",
                  }}
                >
                  Select Lane:
                </label>
                <select
                  value={selectedLaneFilter}
                  onChange={(e) => setSelectedLaneFilter(e.target.value)}
                  style={selectStyle}
                >
                  <option value="all">All Lanes</option>
                  <option value="dark">Dark Lane</option>
                  <option value="farm">Farm Lane</option>
                  <option value="mid">Mid Lane</option>
                  <option value="abyssal">Abyssal Lane</option>
                  <option value="support">Support Lane</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ overflowY: "auto", maxHeight: "600px" }}>
            {renderTableContainer(
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      className={`sortable ${getSortClass("pick")}`}
                      onClick={() => requestSort("pick")}
                    >
                      Pick This
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass("pickLane")}`}
                      onClick={() => requestSort("pickLane")}
                    >
                      Pick Lane
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass("against")}`}
                      onClick={() => requestSort("against")}
                    >
                      Against
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass("againstLane")}`}
                      onClick={() => requestSort("againstLane")}
                    >
                      Against Lane
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass("games")} text-right`}
                      onClick={() => requestSort("games")}
                    >
                      Games
                      <span className="sort-indicator"></span>
                    </th>
                    <th
                      className={`sortable ${getSortClass(
                        "winRate"
                      )} text-right`}
                      onClick={() => requestSort("winRate")}
                    >
                      Win Rate
                      <span className="sort-indicator"></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedCounters()
                    .filter((counter) => counter.games >= 3)
                    .map((counter, index) => (
                      <tr key={index}>
                        <td>
                          <span
                            className="hero-name-link"
                            onClick={() => handleHeroClick(counter.pick)}
                          >
                            {counterSearchMode === "pick" ||
                            counterSearchMode === "both"
                              ? highlightText(counter.pick)
                              : counter.pick}
                          </span>
                        </td>
                        <td>
                          {isMobile
                            ? formatLaneName(counter.pickLane).split(" ")[0]
                            : formatLaneName(counter.pickLane)}
                        </td>
                        <td>
                          <span
                            className="hero-name-link"
                            onClick={() => handleHeroClick(counter.against)}
                          >
                            {counterSearchMode === "against" ||
                            counterSearchMode === "both"
                              ? highlightText(counter.against)
                              : counter.against}
                          </span>
                        </td>
                        <td>
                          {isMobile
                            ? formatLaneName(counter.againstLane).split(" ")[0]
                            : formatLaneName(counter.againstLane)}
                        </td>
                        <td className="text-right">{counter.games}</td>
                        <td className="text-right">{counter.winRate}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          <h3 className="section-title" style={{ marginTop: "20px" }}>
            Perfect Counters (100% Win Rate)
          </h3>
          <div style={{ overflowY: "auto", maxHeight: "300px" }}>
            {renderTableContainer(
              <table className="data-table-sm">
                <thead>
                  <tr>
                    <th>Pick This</th>
                    <th>Pick Lane</th>
                    <th>Against</th>
                    <th>Against Lane</th>
                    <th className="text-right">Games</th>
                    <th className="text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedCounters()
                    .filter(
                      (counter) =>
                        parseFloat(counter.winRate) === 100 &&
                        counter.games >= 3
                    )
                    .map((counter, index) => (
                      <tr key={index}>
                        <td>
                          <span
                            className="hero-name-link"
                            onClick={() => handleHeroClick(counter.pick)}
                          >
                            {counterSearchMode === "pick" ||
                            counterSearchMode === "both"
                              ? highlightText(counter.pick)
                              : counter.pick}
                          </span>
                        </td>
                        <td>
                          {isMobile
                            ? formatLaneName(counter.pickLane).split(" ")[0]
                            : formatLaneName(counter.pickLane)}
                        </td>
                        <td>
                          <span
                            className="hero-name-link"
                            onClick={() => handleHeroClick(counter.against)}
                          >
                            {counterSearchMode === "against" ||
                            counterSearchMode === "both"
                              ? highlightText(counter.against)
                              : counter.against}
                          </span>
                        </td>
                        <td>
                          {isMobile
                            ? formatLaneName(counter.againstLane).split(" ")[0]
                            : formatLaneName(counter.againstLane)}
                        </td>
                        <td className="text-right">{counter.games}</td>
                        <td className="text-right">{counter.winRate}%</td>
                      </tr>
                    ))}
                  {getSortedCounters().filter(
                    (counter) =>
                      parseFloat(counter.winRate) === 100 && counter.games >= 3
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        style={{ textAlign: "center", padding: "20px 0" }}
                      >
                        No perfect counters found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Ban Strategy Tab */}
      {activeTab === "bans" && (
        <div className="content-card">
          <h2 className="section-title">Top Ban Targets</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getTopByBanRate()}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={isMobile ? { fontSize: 10 } : {}}
                />
                <YAxis
                  label={
                    isMobile
                      ? null
                      : {
                          value: "Ban Rate (%)",
                          angle: -90,
                          position: "insideLeft",
                        }
                  }
                />
                <Tooltip formatter={(value) => [`${value}%`, "Ban Rate"]} />
                <Bar dataKey="banRate" fill="#ff8042" name="Ban Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3 className="section-title">Ban Priority by Win Rate</h3>
          <p>Characters with high win rates that are worth banning</p>
          {renderTableContainer(
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`sortable ${getSortClass("character")}`}
                    onClick={() => requestSort("character")}
                  >
                    Character
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass(
                      "pickCount"
                    )} text-right`}
                    onClick={() => requestSort("pickCount")}
                  >
                    Pick Count
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass("winRate")} text-right`}
                    onClick={() => requestSort("winRate")}
                  >
                    Win Rate
                    <span className="sort-indicator"></span>
                  </th>
                  <th
                    className={`sortable ${getSortClass("banRate")} text-right`}
                    onClick={() => requestSort("banRate")}
                  >
                    Ban Rate
                    <span className="sort-indicator"></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedCharacterStats()
                  .filter((char) => char.pickCount >= 5)
                  .map((char, index) => (
                    <tr key={index}>
                      <td>
                        <span
                          className="hero-name-link"
                          onClick={() => handleHeroClick(char.character)}
                        >
                          {highlightText(char.character)}
                        </span>
                      </td>
                      <td className="text-right">{char.pickCount}</td>
                      <td className="text-right">{char.winRate}%</td>
                      <td className="text-right">{char.banRate}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Hero Details Modal */}
      {selectedHero && (
        <HeroDetail
          hero={selectedHero}
          onClose={handleHeroDetailClose}
          characterStats={characterStats}
          laneStats={laneStats}
          synergies={synergies}
          counters={counters}
          data={data}
          isMobile={isMobile}
        />
      )}
    </div>
  );
};

export default Dashboard;
