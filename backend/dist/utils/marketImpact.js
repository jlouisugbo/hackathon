"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketImpactCalculator = void 0;
const nbaData_1 = require("../data/nbaData");
class MarketImpactCalculator {
    static calculateTradeImpact(playerId, tradeType, shares, currentPrice) {
        const players = (0, nbaData_1.getPlayers)();
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
        }
        else if (shares >= 250) {
            impactPercent *= 1.3;
        }
        else if (shares >= 100) {
            impactPercent *= 1.2;
        }
        // Cap maximum impact at 10%
        impactPercent = Math.max(-0.1, Math.min(0.1, impactPercent));
        const priceImpact = currentPrice * impactPercent;
        const newPrice = Math.max(10, currentPrice + priceImpact); // Minimum price floor of $10
        // Determine impact level
        const absImpactPercent = Math.abs(impactPercent);
        let impactLevel = 'minimal';
        if (absImpactPercent >= this.IMPACT_THRESHOLDS.major) {
            impactLevel = 'major';
        }
        else if (absImpactPercent >= this.IMPACT_THRESHOLDS.significant) {
            impactLevel = 'significant';
        }
        else if (absImpactPercent >= this.IMPACT_THRESHOLDS.moderate) {
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
    static getImpactDescription(impactLevel, shares, playerName) {
        const descriptions = {
            minimal: `Small trade of ${shares} shares`,
            moderate: `${shares} shares moving ${playerName}'s price`,
            significant: `Large ${shares} share trade causing price movement in ${playerName}`,
            major: `MASSIVE ${shares} share trade sending ${playerName}'s price soaring!`
        };
        return descriptions[impactLevel];
    }
    static shouldTriggerFlashMultiplier(impactResult, shares) {
        // Trigger flash multiplier for major impacts or very large trades
        return impactResult.impactLevel === 'major' || shares >= 500;
    }
    static calculateFlashMultiplier(impactResult) {
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
exports.MarketImpactCalculator = MarketImpactCalculator;
MarketImpactCalculator.BASE_CIRCULATING_SUPPLY = 1000000; // Base supply for impact calculation
MarketImpactCalculator.IMPACT_THRESHOLDS = {
    minimal: 0.001, // 0.1%
    moderate: 0.005, // 0.5%
    significant: 0.02, // 2%
    major: 0.05 // 5%
};
exports.default = MarketImpactCalculator;
