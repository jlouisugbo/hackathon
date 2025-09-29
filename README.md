# Player Stock Market - NBA Trading Simulation 🏀📈

A real-time NBA player stock market simulation with both **Season Portfolio** and **Live Trading** features. Built with React Native (Expo) frontend and Node.js backend with Socket.IO for real-time updates.

## 🚀 Features

### Core Features
- **Season Portfolio Management** - Long-term NBA player investments
- **Live Trading** - Real-time trading during games with limited trades
- **Flash Multipliers** - Dynamic price boosts during game events
- **Real-time Price Updates** - WebSocket-powered live price feeds
- **Leaderboards** - Season, Live, and Daily rankings
- **Game Simulation** - Pre-scripted events and price movements
- **Real NBA Players** - All active NBA players with real statistics and calculated market values

### Technical Features
- **Monorepo Architecture** - Shared TypeScript types
- **Real-time Communication** - Socket.IO for live updates
- **Real NBA Data** - SportsData API integration with all NBA players
- **RESTful API** - Complete backend API with all endpoints
- **Modern UI** - React Native Paper components with custom theme

## 📱 Screenshots & Design Reference

The app is designed to match modern stock trading apps with a clean, professional interface. Reference your React web app at: https://github.com/jlouisugbo/hackathon-preview

### Converting Web Design to React Native

To integrate your existing web design into this React Native project:

1. **Color Scheme Transfer**:
   ```typescript
   // Update src/theme/theme.ts with your web app colors
   colors: {
     primary: '#your-primary-color',
     secondary: '#your-secondary-color',
     // ... other colors
   }
   ```

2. **Component Mapping**:
   - Web `div` → React Native `View`
   - Web `button` → React Native Paper `Button`
   - Web CSS Grid → React Native `flexDirection: 'row'` with `flexWrap`
   - Web CSS Flexbox → React Native `StyleSheet` with flex properties

3. **Layout Patterns**:
   ```typescript
   // Web: display: grid; grid-template-columns: repeat(3, 1fr);
   // React Native:
   const styles = StyleSheet.create({
     grid: {
       flexDirection: 'row',
       flexWrap: 'wrap',
       justifyContent: 'space-between',
     },
     gridItem: {
       width: '31%', // For 3 columns
     }
   });
   ```

4. **Navigation Integration**:
   Your web routes can map to React Navigation screens:
   - `/portfolio` → `SeasonPortfolioScreen`
   - `/live` → `LiveTradingScreen`
   - `/leaderboard` → `LeaderboardScreen`
   - `/profile` → `ProfileScreen`

## 🛠 Project Structure

```
player-stock-market/
├── backend/                 # Node.js Express + Socket.IO server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── socket/         # Real-time handlers
│   │   ├── data/           # Mock data and game simulation
│   │   └── utils/          # Utilities and price engine
├── frontend/               # Expo React Native app
│   ├── src/
│   │   ├── screens/        # Main app screens
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React Context providers
│   │   ├── services/       # API client
│   │   ├── theme/          # App theming
│   │   └── utils/          # Formatters and utilities
├── shared/                 # Shared TypeScript types
└── package.json           # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Expo CLI (`npm install -g @expo/cli`)
- SportsData API key (for real NBA data)

### Installation

1. **Clone and Install**:
   ```bash
   cd player-stock-market
   npm run install:all
   ```

2. **Set up SportsData API** (for real NBA data):
   ```bash
   # Get your API key from https://sportsdata.io/
   # Add to backend/.env:
   echo "SPORTSDATA_API_KEY=your_api_key_here" >> backend/.env
   ```

3. **Start Development Servers**:
   ```bash
   # Start both backend and frontend concurrently
   npm run dev

   # Or start individually:
   npm run backend:dev    # Backend on port 3001
   npm run frontend:start # Expo dev server
   ```

3. **Open the App**:
   - **iOS**: Press `i` in the Expo terminal or scan QR code with Camera app
   - **Android**: Press `a` in the Expo terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the Expo terminal

## 🔧 Development

### Environment Setup

**Backend** (`.env`):
```bash
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:19006
JWT_SECRET=your-super-secret-jwt-key-for-hackathon
```

**Frontend** (`.env`):
```bash
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001
EXPO_PUBLIC_APP_ENV=development
```

### Available Scripts

```bash
# Root level
npm run dev                 # Start both servers
npm run install:all         # Install all dependencies
npm run clean              # Remove all node_modules

# Backend
npm run backend:dev        # Start with nodemon
npm run backend:build      # Build TypeScript
npm run backend:start      # Start production build

# Frontend
npm run frontend:start     # Start Expo dev server
npm run frontend:android   # Open Android emulator
npm run frontend:ios       # Open iOS simulator
npm run frontend:web       # Open web browser
```

## 📊 API Endpoints

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player details
- `GET /api/players/:id/history` - Get price history
- `GET /api/players/trending/gainers` - Top gainers
- `GET /api/players/trending/losers` - Top losers

### Portfolio
- `GET /api/portfolio/:userId` - Get user portfolio
- `GET /api/portfolio/:userId/performance` - Portfolio stats
- `GET /api/portfolio/:userId/holdings/:accountType` - Get holdings

### Trading
- `POST /api/trades/market` - Execute market order
- `GET /api/trades/:userId/history` - Trade history
- `GET /api/trades/recent` - Recent trades feed

### Leaderboards
- `GET /api/leaderboard/season` - Season rankings
- `GET /api/leaderboard/live` - Live game rankings
- `GET /api/leaderboard/daily` - Daily top performers

### Game
- `GET /api/game/current` - Current live game
- `GET /api/game/status` - Detailed game status
- `GET /api/game/schedule` - Upcoming games

## 🎮 Game Simulation

The backend includes a realistic game simulation with:

### Pre-scripted Events (Demo)
1. **LeBron James** - Clutch three-pointer (2.5x multiplier)
2. **Stephen Curry** - Steal + deep three (3.2x multiplier)
3. **Giannis** - Thunderous dunk (1.8x multiplier)
4. **Luka Dončić** - No-look assist (1.5x multiplier)
5. **Joel Embiid** - Massive block (2.1x multiplier)
6. **Curry Game Winner** - Game-winning shot (5.0x multiplier)

### Price Update System
- **Price Updates**: Every 8-12 seconds during live games
- **Flash Multipliers**: 15% chance per update cycle
- **Volatility**: Player-specific volatility ratings (0.1-0.3)
- **Market Hours**: Active during simulated game time

## 📱 Converting Your Web Design

### 1. Extract Design Tokens
From your web app, identify:
- **Colors**: Primary, secondary, accent colors
- **Typography**: Font sizes, weights, line heights
- **Spacing**: Margins, paddings, gaps
- **Border Radius**: Corner radius values
- **Shadows**: Box shadow equivalents

### 2. Map Web Components to React Native

| Web Element | React Native Equivalent |
|-------------|------------------------|
| `<div>` | `<View>` |
| `<button>` | `<Button>` from react-native-paper |
| `<input>` | `<TextInput>` |
| `<img>` | `<Image>` |
| CSS Grid | `flexDirection: 'row'` + `flexWrap` |
| CSS Flexbox | StyleSheet with flex properties |
| CSS positioning | `position: 'absolute'` |

### 3. Responsive Design
```typescript
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: width > 768 ? '50%' : '100%', // Tablet vs mobile
  }
});
```

### 4. Animation Integration
If your web app has animations, use:
- **react-native-reanimated** for complex animations
- **expo-haptics** for tactile feedback
- **react-native-animatable** for simple transitions

### 5. Platform-Specific Styling
```typescript
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  card: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});
```

## 🎯 Demo Data

### Mock Users
- 10 users with realistic portfolios
- Season holdings (2-4 positions each)
- Live holdings (0-2 positions each)
- Trading history and performance stats

### NBA Players (Mock Data)
1. **LeBron James** (LAL) - $189.50
2. **Stephen Curry** (GSW) - $176.25
3. **Giannis Antetokounmpo** (MIL) - $195.75
4. **Luka Dončić** (DAL) - $182.40
5. **Jayson Tatum** (BOS) - $168.90
6. **Joel Embiid** (PHI) - $173.60
7. **Nikola Jokić** (DEN) - $187.30
8. **Kevin Durant** (PHX) - $165.80
9. **Damian Lillard** (MIL) - $159.45
10. **Anthony Davis** (LAL) - $171.20

Each player includes:
- 30 days of realistic price history
- Current stats (PPG, RPG, APG, FG%, 3P%)
- Team information and playing status
- Individual volatility ratings

## 🔄 Real-time Features

### Socket.IO Events

**Client → Server**:
- `join_room` - Join user room
- `send_chat_message` - Send chat message
- `subscribe_player` - Subscribe to player updates
- `join_live_trading` - Join live trading room

**Server → Client**:
- `price_update` - Real-time price changes
- `flash_multiplier` - Flash multiplier events
- `game_event` - Game events (dunks, assists, etc.)
- `leaderboard_update` - Updated rankings
- `trade_executed` - Trade confirmations

## 🛠 Customization

### Adding New Players
```typescript
// backend/src/data/mockData.ts
const newPlayer = {
  name: 'Player Name',
  team: 'TEAM',
  position: 'PG' as const,
  basePrice: 150.00,
  volatility: 0.18,
  jersey: 24,
  stats: { ppg: 25.0, rpg: 6.0, apg: 8.0, fg: 0.485, threePt: 0.365, gamesPlayed: 70, minutesPerGame: 35.0 }
};
```

### Customizing Game Events
```typescript
// backend/src/socket/gameSimulation.ts
const customEvent = {
  playerName: 'Player Name',
  eventType: 'three_pointer',
  multiplier: 2.0,
  description: 'Custom event description!',
  priceImpact: 12.50,
  quarter: 4,
  gameTime: '2:30'
};
```

### Theme Customization
```typescript
// frontend/src/theme/theme.ts
export const theme = {
  colors: {
    primary: '#your-primary-color',
    secondary: '#your-secondary-color',
    bullish: '#your-green-color',
    bearish: '#your-red-color',
    // ... other colors
  }
};
```

## 🚀 Deployment

### Backend Deployment
1. **Build**: `npm run build`
2. **Environment**: Set production environment variables
3. **Deploy**: Use services like Railway, Render, or Vercel

### Frontend Deployment
1. **Expo Build**: `expo build:web` for web deployment
2. **EAS Build**: `eas build` for app store builds
3. **Update API URL**: Point to production backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is for hackathon/educational purposes. Not for commercial use.

## 🎯 Hackathon Ready

This skeleton provides:
- ✅ **Complete Backend API** with all endpoints
- ✅ **Real-time Socket.IO Integration**
- ✅ **React Native Frontend** with navigation
- ✅ **Mock Data System** for immediate testing
- ✅ **Game Simulation** with pre-scripted events
- ✅ **Responsive Design** for mobile/tablet
- ✅ **TypeScript** throughout for type safety
- ✅ **Development Tools** for rapid iteration

Start coding your hackathon features immediately - the foundation is ready! 🚀

---

**Happy Hacking! 🏀📱**