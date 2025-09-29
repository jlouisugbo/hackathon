# SportsData API Setup

This application now uses real NBA player data from the SportsData API instead of mock data.

## Setup Instructions

### 1. Get SportsData API Key

1. Visit [SportsData.io](https://sportsdata.io/) and sign up for an account
2. Subscribe to the NBA API plan (they offer free trials)
3. Get your API key from the dashboard

### 2. Configure Environment Variables

Add the following to your `.env` file in the backend directory:

```bash
# SportsData API Configuration
SPORTSDATA_API_KEY=your_api_key_here
```

### 3. API Endpoints Used

The application uses the following SportsData API endpoints:

- **Players**: `/scores/json/Players` - Get all NBA players
- **Player Stats**: `/scores/json/PlayerSeasonStats/{year}` - Get player season statistics

### 4. Data Mapping

The application maps SportsData API responses to our internal Player format:

- **Player ID**: `nba-{PlayerID}` (prefixed to avoid conflicts)
- **Name**: Direct mapping from `Name` field
- **Team**: Direct mapping from `Team` field
- **Position**: Mapped from `Position` to our position enum
- **Stats**: Calculated from season statistics
- **Price**: Calculated based on performance metrics (PPG, RPG, APG, shooting percentages, etc.)

### 5. Fallback Behavior

If the SportsData API is unavailable or returns no data:
- The application will log a warning
- Players array will be empty
- Users can still access the application but won't see any players

### 6. Caching

The NBA Players Service includes caching to reduce API calls:
- Cache duration: 5 minutes
- Cache is automatically cleared when refreshing data

### 7. Price Calculation

Player prices are calculated based on:
- Points per game (heavily weighted)
- Rebounds and assists per game
- Shooting percentages (FG%, 3P%, FT%)
- Fantasy points per game
- Player experience
- Position-based adjustments

### 8. Development vs Production

- **Development**: Uses mock data if API key is not provided
- **Production**: Requires valid API key for real NBA data

## Troubleshooting

### No Players Loading
1. Check if `SPORTSDATA_API_KEY` is set correctly
2. Verify the API key is valid and has NBA access
3. Check network connectivity
4. Look for error messages in the console

### API Rate Limits
- The service includes caching to minimize API calls
- If you hit rate limits, the cache will help reduce requests
- Consider upgrading your SportsData plan if needed

### Data Quality
- Player prices are calculated algorithmically based on stats
- Some players may have unusual prices due to limited games or stats
- The system includes minimum price floors to prevent unrealistic values
