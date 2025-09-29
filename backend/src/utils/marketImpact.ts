import { Player } from '../types';
import { getPlayers } from '../data/nbaData';

export interface MarketImpactResult {
  priceImpact: number;
  priceImpactPercent: number;
  newPrice: number;
  impactLevel: 'minimal' | 'moderate' | 'significant' | 'major';
  broadcastRequired: boolean;
}

export class MarketImpactCalculator {
  private static readonly BASE_CIRCULATING_SUPPLY = 1000000; // Base supply for impact calculation
  private static readonly IMPACT_THRESHOLDS = {
    minimal: 0.001,   // 0.1%
    moderate: 0.005,  // 0.5%
    significant: 0.02, // 2%
    major: 0.05       // 5%
  };

  static calculateTradeImpact(
    playerId: string,
    tradeType: 'buy' | 'sell',
    shares: number,
    currentPrice: number
  ): MarketImpactResult {
    const players = getPlayers();
    const player = players.find(p => p.id === playerId);

    if (!player) {
      return {
        priceImpact: 0,
        priceImpactPercent: 0,
        newPrice: currentPrice,
        impactLevel: 'minimal',
        broadcastRequired: false
      };
    }

    // Calculate base impact based on trade volume relative to supply
    const tradeVolume = shares * currentPrice;
    const marketCap = this.BASE_CIRCULATING_SUPPLY * currentPrice;
    const volumeRatio = tradeVolume / marketCap;

    // Apply volatility multiplier - more volatile players have higher impact
    const volatilityMultiplier = 1 + (player.volatility * 2);

    // Direction multiplier (buying increases price, selling decreases)
    const directionMultiplier = tradeType === 'buy' ? 1 : -1;

    // Base impact percentage
    let impactPercent = volumeRatio * volatilityMultiplier * directionMultiplier;

    // Apply progressive scaling for larger trades
    if (shares >= 500) {
      impactPercent *= 1.5; // Large trades have amplified impact
    } else if (shares >= 250) {
      impactPercent *= 1.3;
    } else if (shares >= 100) {
      impactPercent *= 1.2;
    }

    // Cap maximum impact at 10%
    impactPercent = Math.max(-0.1, Math.min(0.1, impactPercent));

    const priceImpact = currentPrice * impactPercent;
    const newPrice = Math.max(10, currentPrice + priceImpact); // Minimum price floor of $10

    // Determine impact level
    const absImpactPercent = Math.abs(impactPercent);
    let impactLevel: MarketImpactResult['impactLevel'] = 'minimal';

    if (absImpactPercent >= this.IMPACT_THRESHOLDS.major) {
      impactLevel = 'major';
    } else if (absImpactPercent >= this.IMPACT_THRESHOLDS.significant) {
      impactLevel = 'significant';
    } else if (absImpactPercent >= this.IMPACT_THRESHOLDS.moderate) {
      impactLevel = 'moderate';
    }

    // Broadcast required for moderate impact or higher, or trades of 100+ shares
    const broadcastRequired = impactLevel !== 'minimal' || shares >= 100;

    return {
      priceImpact: Math.round(priceImpact * 100) / 100,
      priceImpactPercent: Math.round(impactPercent * 10000) / 100, // Convert to percentage
      newPrice: Math.round(newPrice * 100) / 100,
      impactLevel,
      broadcastRequired
    };
  }

  static getImpactDescription(impactLevel: MarketImpactResult['impactLevel'], shares: number, playerName: string): string {
    const descriptions = {
      minimal: `Small trade of ${shares} shares`,
      moderate: `${shares} shares moving ${playerName}'s price`,
      significant: `Large ${shares} share trade causing price movement in ${playerName}`,
      major: `MASSIVE ${shares} share trade sending ${playerName}'s price soaring!`
    };

    return descriptions[impactLevel];
  }

  static shouldTriggerFlashMultiplier(impactResult: MarketImpactResult, shares: number): boolean {
    // Trigger flash multiplier for major impacts or very large trades
    return impactResult.impactLevel === 'major' || shares >= 500;
  }

  static calculateFlashMultiplier(impactResult: MarketImpactResult): number {
    const baseMultiplier = 1.15; // 15% base multiplier

    switch (impactResult.impactLevel) {
      case 'major':
        return 1.25; // 25% for major impact
      case 'significant':
        return 1.20; // 20% for significant impact
      case 'moderate':
        return 1.15; // 15% for moderate impact
      default:
        return 1.0; // No multiplier for minimal impact
    }
  }
}

export default MarketImpactCalculator;