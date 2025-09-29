// Test script for NBA data service
const { initializeNBAData, getPlayers } = require('./dist/data/nbaData');

async function testNBAData() {
  console.log('🧪 Testing NBA data service...');
  
  try {
    // Initialize NBA data
    await initializeNBAData();
    
    // Get players
    const players = getPlayers();
    
    console.log(`✅ Loaded ${players.length} NBA players`);
    
    if (players.length > 0) {
      console.log('\n📋 Sample players:');
      players.slice(0, 5).forEach(player => {
        console.log(`- ${player.name} (${player.team}) - $${player.currentPrice.toFixed(2)}`);
      });
      
      console.log('\n📊 Player distribution by position:');
      const positionCount = {};
      players.forEach(player => {
        positionCount[player.position] = (positionCount[player.position] || 0) + 1;
      });
      Object.entries(positionCount).forEach(([pos, count]) => {
        console.log(`- ${pos}: ${count} players`);
      });
      
      console.log('\n💰 Price range:');
      const prices = players.map(p => p.currentPrice);
      console.log(`- Min: $${Math.min(...prices).toFixed(2)}`);
      console.log(`- Max: $${Math.max(...prices).toFixed(2)}`);
      console.log(`- Avg: $${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`);
    } else {
      console.log('⚠️ No players loaded - check API key and network connection');
    }
    
  } catch (error) {
    console.error('❌ Error testing NBA data:', error);
  }
}

testNBAData();
