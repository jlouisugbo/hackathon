# 🎮 NBA Game Simulation Guide

This guide explains how to use the SportsData API to fetch past game data and simulate NBA games for your player stock market application.

## 🏀 Available Data Sources

The SportsData API provides comprehensive NBA data including:

- **Game Information**: Scores, teams, dates, venues
- **Play-by-Play Data**: Every play in a game with timestamps
- **Player Statistics**: Individual player performance metrics
- **Historical Data**: Games from previous seasons
- **Real-time Updates**: Live game data

## 📊 API Endpoints

### 1. Recent Games
```http
GET /api/simulation/games/recent
```
Returns the most recent NBA games.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "GameID": 12345,
      "AwayTeam": "LAL",
      "HomeTeam": "GSW",
      "AwayTeamScore": 110,
      "HomeTeamScore": 108,
      "DateTime": "2024-01-15T20:00:00",
      "Status": "Final"
    }
  ],
  "message": "Retrieved 5 recent games"
}
```

### 2. Games by Date
```http
GET /api/simulation/games/date/2024-01-15
```
Returns all games for a specific date (YYYY-MM-DD format).

### 3. Games by Season
```http
GET /api/simulation/games/season/2024
```
Returns all games for a specific season.

### 4. Play-by-Play Data
```http
GET /api/simulation/play-by-play/12345
```
Returns every play in a specific game.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "PlayID": 1,
      "GameID": 12345,
      "Quarter": 1,
      "TimeRemaining": "12:00",
      "AwayScore": 0,
      "HomeScore": 0,
      "Team": "LAL",
      "Description": "LeBron James makes 2-pt jump shot from 15 ft"
    }
  ],
  "message": "Retrieved 150 plays for game 12345"
}
```

### 5. Player Game Stats
```http
GET /api/simulation/player-stats/12345
```
Returns individual player statistics for a specific game.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "PlayerID": 20002725,
      "Name": "LeBron James",
      "Team": "LAL",
      "Points": 25,
      "Rebounds": 8,
      "Assists": 10,
      "FantasyPoints": 45.5,
      "Minutes": 35,
      "FieldGoalsMade": 10,
      "FieldGoalsAttempted": 18
    }
  ],
  "message": "Retrieved 20 player stats for game 12345"
}
```

### 6. Complete Game Simulation
```http
GET /api/simulation/simulate/12345
```
Returns a complete game simulation with events, scores, and top performers.

**Response:**
```json
{
  "success": true,
  "data": {
    "game": {
      "GameID": 12345,
      "AwayTeam": "LAL",
      "HomeTeam": "GSW",
      "AwayTeamScore": 110,
      "HomeTeamScore": 108
    },
    "simulation": {
      "events": [
        {
          "time": "12:00",
          "description": "LeBron James makes 2-pt jump shot",
          "awayScore": 2,
          "homeScore": 0,
          "impact": "high"
        }
      ],
      "finalScore": {
        "away": 110,
        "home": 108
      },
      "topPerformers": [
        {
          "playerId": 20002725,
          "name": "LeBron James",
          "team": "LAL",
          "points": 25,
          "fantasyPoints": 45.5
        }
      ]
    }
  },
  "message": "Game simulation completed for game 12345"
}
```

### 7. Replay Simulation (2025 NBA Finals)
```http
GET /api/simulation/replay/22398
```
Returns a complete replay simulation using SportsData's replay API for the 2025 NBA Finals.

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": 22398,
    "gameTitle": "2025 NBA Finals - Boston Celtics vs Oklahoma City Thunder",
    "totalPlays": 1114,
    "events": [
      {
        "time": "12:00",
        "description": "Jayson Tatum makes 3-pointer from 25 ft",
        "awayScore": 3,
        "homeScore": 0,
        "impact": "high"
      }
    ],
    "finalScore": {
      "away": 98,
      "home": 95
    },
    "topPerformers": []
  },
  "message": "Replay simulation completed for game 22398"
}
```

## 🎯 Use Cases for Game Simulation

### 1. **Historical Analysis**
- Analyze past game performance
- Study player trends over time
- Identify patterns in team performance

### 2. **Player Valuation**
- Use historical stats to calculate player values
- Factor in performance consistency
- Consider matchup-specific performance

### 3. **Live Trading Events**
- Simulate game events in real-time
- Trigger price changes based on plays
- Create excitement during live games

### 4. **Educational Content**
- Show how specific plays affect player values
- Demonstrate market dynamics
- Create engaging user experiences

## 🚀 Implementation Examples

### Frontend Integration

```typescript
// Fetch recent games
const fetchRecentGames = async () => {
  const response = await fetch('/api/simulation/games/recent');
  const data = await response.json();
  return data.data;
};

// Simulate a specific game
const simulateGame = async (gameId: number) => {
  const response = await fetch(`/api/simulation/simulate/${gameId}`);
  const data = await response.json();
  return data.data;
};

// Get play-by-play for live updates
const getPlayByPlay = async (gameId: number) => {
  const response = await fetch(`/api/simulation/play-by-play/${gameId}`);
  const data = await response.json();
  return data.data;
};
```

### Real-time Game Simulation

```typescript
// Simulate a game event by event
const simulateGameEvents = async (gameId: number) => {
  const simulation = await simulateGame(gameId);
  
  // Process events in chronological order
  simulation.simulation.events.forEach((event, index) => {
    setTimeout(() => {
      console.log(`[${event.time}] ${event.description}`);
      
      // Update player prices based on event impact
      if (event.impact === 'high') {
        updatePlayerPrices(event);
      }
      
      // Broadcast to connected clients
      io.emit('gameEvent', event);
    }, index * 1000); // 1 second between events
  });
};
```

## 🔧 Testing the API

Run the test script to verify all endpoints:

```bash
cd backend
node test-game-simulation.js
```

This will test all endpoints and show sample data.

## 📈 Advanced Features

### 1. **Event Impact Scoring**
- High impact: 3-pointers, dunks, blocks, steals
- Medium impact: 2-pointers, assists, rebounds
- Low impact: substitutions, timeouts

### 2. **Fantasy Points Calculation**
- Points: 1 point per point scored
- Rebounds: 1.2 points per rebound
- Assists: 1.5 points per assist
- Steals: 3 points per steal
- Blocks: 3 points per block
- Turnovers: -1 point per turnover

### 3. **Player Performance Metrics**
- True Shooting Percentage
- Player Efficiency Rating
- Usage Rate
- Plus/Minus

## 🎮 Game Simulation Scenarios

### Scenario 1: Live Game Replay
```typescript
// Replay a past game with real-time updates
const replayGame = async (gameId: number) => {
  const simulation = await simulateGame(gameId);
  
  // Start the replay
  simulation.simulation.events.forEach((event, index) => {
    setTimeout(() => {
      // Update UI with current game state
      updateGameDisplay(event);
      
      // Trigger price updates for affected players
      if (event.impact === 'high') {
        triggerPriceUpdate(event);
      }
    }, index * 2000); // 2 seconds between events
  });
};
```

### Scenario 2: Market Impact Analysis
```typescript
// Analyze how game events affect player prices
const analyzeMarketImpact = async (gameId: number) => {
  const simulation = await simulateGame(gameId);
  
  const priceChanges = simulation.simulation.events
    .filter(event => event.impact === 'high')
    .map(event => ({
      time: event.time,
      description: event.description,
      expectedPriceChange: calculatePriceImpact(event)
    }));
  
  return priceChanges;
};
```

## 🔑 API Key Configuration

Make sure your SportsData API key is configured:

```bash
export SPORTSDATA_API_KEY=your_api_key_here
```

### **Replay API Access**

The replay simulation endpoints require access to SportsData's replay system, which provides historical game data with full play-by-play information. To use the replay endpoints:

1. **Contact SportsData**: Request access to their replay system
2. **Get Replay API Key**: You'll receive a special replay API key
3. **Configure Environment**: Set the replay API key in your environment

```bash
export SPORTSDATA_REPLAY_API_KEY=your_replay_api_key_here
```

**Note**: The replay API provides access to specific historical games (like the 2025 NBA Finals) with complete play-by-play data, making it perfect for game simulation and analysis.

## 📊 Data Limitations

- **Historical Data**: Available from 2020 onwards
- **Play-by-Play**: May not be available for all games
- **Rate Limits**: 1000 requests per day (free tier)
- **Real-time**: 15-minute delay for live games

## 🎯 Best Practices

1. **Cache Results**: Store frequently accessed data
2. **Error Handling**: Always handle API failures gracefully
3. **Rate Limiting**: Implement request throttling
4. **Data Validation**: Verify data before processing
5. **User Experience**: Show loading states and progress

## 🚀 Next Steps

1. **Integrate with Frontend**: Add game simulation to your React Native app
2. **Real-time Updates**: Use WebSockets for live game events
3. **Price Engine**: Connect game events to player price changes
4. **Analytics**: Track user engagement with game simulations
5. **Mobile Optimization**: Ensure smooth performance on mobile devices

This game simulation system provides a powerful foundation for creating engaging, data-driven experiences in your NBA player stock market application! 🏀📈
