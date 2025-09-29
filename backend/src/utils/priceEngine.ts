import { Player } from '../types';
import { updatePlayerPrice, syncPortfoliosWithPrices, checkLimitOrders, getPlayers } from '../data/nbaData';

export class PriceEngine {
  private static instance: PriceEngine;
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private priceUpdateCallbacks: ((playerId: string, newPrice: number, change: number) => void)[] = [];

  static getInstance(): PriceEngine {
    if (!PriceEngine.instance) {
      PriceEngine.instance = new PriceEngine();
    }
    return PriceEngine.instance;
  }

  // Register callback for when prices update (for Joel's socket system)
  onPriceUpdate(callback: (playerId: string, newPrice: number, change: number) => void) {
    this.priceUpdateCallbacks.push(callback);
  }

  startPriceUpdates(players: Player[], intervalMs: number = 10000) {
    if (this.isRunning) {
      console.log('⚠️ Price engine already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting price update engine...');

    this.updateInterval = setInterval(() => {
      this.updatePrices(players);
    }, intervalMs) as unknown as NodeJS.Timeout;
  }

  stopPriceUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Price update engine stopped');
  }

  private updatePrices(players: Player[]) {
    players.forEach(player => {
      const oldPrice = player.currentPrice;
      
      // Base volatility-driven price change
      const baseChange = (Math.random() - 0.5) * 2 * player.volatility * player.currentPrice;
      
      // Game performance factor (mock - in real app this would come from live game data)
      const performanceFactor = this.calculatePerformanceFactor(player);
      
      // Market sentiment (random for demo)
      const sentimentFactor = (Math.random() - 0.5) * 0.1;
      
      const totalChangePercent = baseChange + (performanceFactor * player.currentPrice) + (sentimentFactor * player.currentPrice);
      const newPrice = Math.max(10, player.currentPrice + totalChangePercent);
      
      // Round to 2 decimal places
      const roundedPrice = Math.round(newPrice * 100) / 100;
      const change = roundedPrice - oldPrice;
      
      updatePlayerPrice(player.id, roundedPrice);
      
      // Sync portfolios with new prices
      syncPortfoliosWithPrices();
      
      // Check limit orders
      checkLimitOrders();
      
      // Notify WebSocket callbacks (for Joel's system)
      this.priceUpdateCallbacks.forEach(callback => callback(player.id, roundedPrice, change));
      
      // Log significant price movements
      const changePercent = Math.abs(change / oldPrice) * 100;
      if (changePercent > 5) {
        console.log(`📈 ${player.name}: ${change > 0 ? '+' : '-'}${changePercent.toFixed(2)}% from $${oldPrice.toFixed(2)} to $${roundedPrice.toFixed(2)}`);
      }
    });
  }

  private calculatePerformanceFactor(player: Player): number {
    // Mock performance calculation based on player stats
    // In real app, this would use live game stats
    const statScore = (player.stats.ppg * 0.4) + (player.stats.apg * 0.3) + (player.stats.rpg * 0.2) + (player.stats.fg * 0.1);
    const normalizedScore = (statScore - 20) / 30; // Normalize around 20-50 range
    
    return normalizedScore * 0.02; // Max 2% impact from performance
  }

  // Flash multiplier for exciting moments - called by Joel's game simulation
  applyFlashMultiplier(playerId: string, multiplier: number, reason: string): boolean {
    try {
      const players = getPlayers();
      const player = players.find((p: Player) => p.id === playerId);
      
      if (!player) return false;

      const oldPrice = player.currentPrice;
      const priceBoost = player.currentPrice * (multiplier - 1);
      const newPrice = Math.round((player.currentPrice + priceBoost) * 100) / 100;
      const change = newPrice - oldPrice;
      
      updatePlayerPrice(playerId, newPrice);
      
      // Sync portfolios and check limit orders
      syncPortfoliosWithPrices();
      checkLimitOrders();
      
      // Notify callbacks
      this.priceUpdateCallbacks.forEach(callback => callback(playerId, newPrice, change));
      
      console.log(`⚡ FLASH MULTIPLIER: ${player.name} +${((multiplier - 1) * 100).toFixed(1)}% - ${reason}`);
      
      return true;
    } catch (error) {
      console.error('Error applying flash multiplier:', error);
      return false;
    }
  }

  // REST endpoint for Joel's socket system to trigger flash multipliers
  triggerFlashMultiplier = (playerId: string, multiplier: number, reason: string) => {
    return this.applyFlashMultiplier(playerId, multiplier, reason);
  };

  // Get current market data for Joel's broadcasts
  getMarketData = (players: Player[]) => {
    const topGainer = players.reduce((max, p) => p.priceChangePercent24h > max.priceChangePercent24h ? p : max);
    const topLoser = players.reduce((min, p) => p.priceChangePercent24h < min.priceChangePercent24h ? p : min);
    
    return {
      totalMarketCap: players.reduce((sum, p) => sum + (p.currentPrice * 1000000), 0), // Mock market cap
      totalVolume24h: Math.floor(Math.random() * 10000000) + 1000000, // Mock volume
      activeTraders: Math.floor(Math.random() * 500) + 100, // Mock active traders
      topGainer: {
        playerId: topGainer.id,
        playerName: topGainer.name,
        priceChange: topGainer.priceChange24h,
        priceChangePercent: topGainer.priceChangePercent24h
      },
      topLoser: {
        playerId: topLoser.id,
        playerName: topLoser.name,
        priceChange: topLoser.priceChange24h,
        priceChangePercent: topLoser.priceChangePercent24h
      }
    };
  };
}

export default PriceEngine;