const axios = require('axios');

const API_BASE_URL = 'http://localhost:3003';

async function testGameSimulation() {
  console.log('🎮 Testing Game Simulation API...\n');

  try {
    // Test 1: Get recent games
    console.log('1️⃣ Fetching recent games...');
    const recentGamesResponse = await axios.get(`${API_BASE_URL}/api/simulation/games/recent`);
    console.log(`✅ Found ${recentGamesResponse.data.data.length} recent games`);
    
    if (recentGamesResponse.data.data.length > 0) {
      const firstGame = recentGamesResponse.data.data[0];
      console.log(`   📊 Sample game: ${firstGame.AwayTeam} vs ${firstGame.HomeTeam} (ID: ${firstGame.GameID})`);
      
      // Test 2: Get play-by-play for the first game
      console.log('\n2️⃣ Fetching play-by-play data...');
      try {
        const playByPlayResponse = await axios.get(`${API_BASE_URL}/api/simulation/play-by-play/${firstGame.GameID}`);
        console.log(`✅ Found ${playByPlayResponse.data.data.length} plays`);
        
        if (playByPlayResponse.data.data.length > 0) {
          console.log(`   🏀 Sample play: ${playByPlayResponse.data.data[0].Description}`);
        }
      } catch (playError) {
        console.log(`⚠️ Play-by-play not available for this game: ${playError.response?.data?.message || playError.message}`);
      }

      // Test 3: Get player stats for the first game
      console.log('\n3️⃣ Fetching player stats...');
      try {
        const playerStatsResponse = await axios.get(`${API_BASE_URL}/api/simulation/player-stats/${firstGame.GameID}`);
        console.log(`✅ Found ${playerStatsResponse.data.data.length} player stats`);
        
        if (playerStatsResponse.data.data.length > 0) {
          const topPlayer = playerStatsResponse.data.data
            .filter(p => p.Played)
            .sort((a, b) => b.Points - a.Points)[0];
          console.log(`   🏆 Top scorer: ${topPlayer.Name} (${topPlayer.Points} points, ${topPlayer.FantasyPoints} fantasy points)`);
        }
      } catch (statsError) {
        console.log(`⚠️ Player stats not available for this game: ${statsError.response?.data?.message || statsError.message}`);
      }

      // Test 4: Simulate the complete game
      console.log('\n4️⃣ Simulating complete game...');
      try {
        const simulationResponse = await axios.get(`${API_BASE_URL}/api/simulation/simulate/${firstGame.GameID}`);
        const simulation = simulationResponse.data.data;
        
        console.log(`✅ Game simulation completed!`);
        console.log(`   🏀 Final Score: ${simulation.game.AwayTeam} ${simulation.simulation.finalScore.away} - ${simulation.simulation.finalScore.home} ${simulation.game.HomeTeam}`);
        console.log(`   📊 Total plays: ${simulation.simulation.events.length}`);
        console.log(`   🏆 Top performers:`);
        
        simulation.simulation.topPerformers.slice(0, 3).forEach((player, index) => {
          console.log(`      ${index + 1}. ${player.name} (${player.team}) - ${player.points} points, ${player.fantasyPoints} fantasy points`);
        });
        
        console.log(`\n   🎬 Sample events:`);
        simulation.simulation.events.slice(0, 5).forEach((event, index) => {
          console.log(`      ${index + 1}. [${event.time}] ${event.description} (${event.impact} impact)`);
        });
        
      } catch (simError) {
        console.log(`⚠️ Game simulation not available: ${simError.response?.data?.message || simError.message}`);
      }
    }

    // Test 5: Get games by date (yesterday)
    console.log('\n5️⃣ Testing games by date...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0];
    
    try {
      const gamesByDateResponse = await axios.get(`${API_BASE_URL}/api/simulation/games/date/${dateString}`);
      console.log(`✅ Found ${gamesByDateResponse.data.data.length} games for ${dateString}`);
    } catch (dateError) {
      console.log(`⚠️ No games found for ${dateString}: ${dateError.response?.data?.message || dateError.message}`);
    }

    // Test 6: Get games by season
    console.log('\n6️⃣ Testing games by season...');
    try {
      const gamesBySeasonResponse = await axios.get(`${API_BASE_URL}/api/simulation/games/season/2024`);
      console.log(`✅ Found ${gamesBySeasonResponse.data.data.length} games for 2024 season`);
    } catch (seasonError) {
      console.log(`⚠️ Season data not available: ${seasonError.response?.data?.message || seasonError.message}`);
    }

    // Test 7: Replay simulation (2025 NBA Finals)
    console.log('\n7️⃣ Testing replay simulation (2025 NBA Finals)...');
    try {
      const replayResponse = await axios.get(`${API_BASE_URL}/api/simulation/replay/22398`);
      const replay = replayResponse.data.data;
      
      console.log(`✅ Replay simulation completed!`);
      console.log(`   🏀 Game: ${replay.gameTitle}`);
      console.log(`   📊 Total plays: ${replay.totalPlays}`);
      console.log(`   🏆 Final Score: ${replay.finalScore.away} - ${replay.finalScore.home}`);
      
      if (replay.events.length > 0) {
        console.log(`\n   🎬 Sample events:`);
        replay.events.slice(0, 5).forEach((event, index) => {
          console.log(`      ${index + 1}. [${event.time}] ${event.description} (${event.impact} impact)`);
        });
      }
      
    } catch (replayError) {
      console.log(`⚠️ Replay simulation not available: ${replayError.response?.data?.message || replayError.message}`);
    }

    console.log('\n🎉 Game Simulation API test completed!');
    console.log('\n📋 Available endpoints:');
    console.log('   • GET /api/simulation/games/recent - Recent games');
    console.log('   • GET /api/simulation/games/date/:date - Games by date (YYYY-MM-DD)');
    console.log('   • GET /api/simulation/games/season/:season - Games by season');
    console.log('   • GET /api/simulation/play-by-play/:gameId - Play-by-play data');
    console.log('   • GET /api/simulation/player-stats/:gameId - Player game stats');
    console.log('   • GET /api/simulation/simulate/:gameId - Complete game simulation');
    console.log('   • GET /api/simulation/replay/:gameId - Replay simulation (2025 NBA Finals)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testGameSimulation();
