"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realPriceEngine = exports.RealPriceEngine = void 0;
const liveDataService_1 = require("../services/liveDataService");
class RealPriceEngine {
    constructor() {
        this.basePrices = new Map();
        this.currentPrices = new Map();
    }
    // Set base prices for players
    setBasePrice(playerId, price) {
        this.basePrices.set(playerId, price);
        this.currentPrices.set(playerId, price);
    }
    // Get current price for a player
    getCurrentPrice(playerId) {
        return this.currentPrices.get(playerId) || 0;
    }
    // Calculate price based on real performance
    calculatePriceFromPerformance(basePrice, performance) {
        // Performance scoring weights
        const weights = {
            points: 0.4, // 40% weight on points
            rebounds: 0.2, // 20% weight on rebounds
            assists: 0.2, // 20% weight on assists
            steals: 0.1, // 10% weight on steals
            blocks: 0.1 // 10% weight on blocks
        };
        // Calculate performance score
        const performanceScore = (performance.points * weights.points) +
            (performance.rebounds * weights.rebounds) +
            (performance.assists * weights.assists) +
            (performance.steals * weights.steals) +
            (performance.blocks * weights.blocks);
        // Calculate shooting efficiency bonus/penalty
        const shootingEfficiency = this.calculateShootingEfficiency(performance);
        // Calculate turnover penalty
        const turnoverPenalty = performance.turnovers * -0.5;
        // Total performance impact
        const totalImpact = performanceScore + shootingEfficiency + turnoverPenalty;
        // Apply performance impact to base price
        const performanceMultiplier = totalImpact / 100; // Convert to percentage
        const newPrice = basePrice * (1 + performanceMultiplier);
        return Math.round(newPrice * 100) / 100; // Round to 2 decimal places
    }
    // Calculate shooting efficiency impact
    calculateShootingEfficiency(performance) {
        const fgPercentage = performance.fieldGoalsAttempted > 0
            ? (performance.fieldGoalsMade / performance.fieldGoalsAttempted) * 100
            : 0;
        const threePointPercentage = performance.threePointersAttempted > 0
            ? (performance.threePointersMade / performance.threePointersAttempted) * 100
            : 0;
        const ftPercentage = performance.freeThrowsAttempted > 0
            ? (performance.freeThrowsMade / performance.freeThrowsAttempted) * 100
            : 0;
        // Efficiency bonus/penalty
        const fgBonus = (fgPercentage - 45) * 0.1; // 45% is average
        const threePointBonus = (threePointPercentage - 35) * 0.15; // 35% is average
        const ftBonus = (ftPercentage - 80) * 0.05; // 80% is average
        return fgBonus + threePointBonus + ftBonus;
    }
    // Update prices for all players in a game
    async updatePricesForGame(gameId) {
        try {
            const liveStats = await liveDataService_1.liveDataService.getLivePlayerStats(gameId);
            const priceUpdates = [];
            for (const player of liveStats) {
                const playerId = player.PlayerID.toString();
                const basePrice = this.basePrices.get(playerId);
                if (!basePrice)
                    continue;
                const performance = {
                    playerId: playerId,
                    playerName: player.Name,
                    points: player.Points || 0,
                    rebounds: player.Rebounds || 0,
                    assists: player.Assists || 0,
                    steals: player.Steals || 0,
                    blocks: player.Blocks || 0,
                    turnovers: player.Turnovers || 0,
                    minutes: player.Minutes || 0,
                    fieldGoalsMade: player.FieldGoalsMade || 0,
                    fieldGoalsAttempted: player.FieldGoalsAttempted || 0,
                    threePointersMade: player.ThreePointersMade || 0,
                    threePointersAttempted: player.ThreePointersAttempted || 0,
                    freeThrowsMade: player.FreeThrowsMade || 0,
                    freeThrowsAttempted: player.FreeThrowsAttempted || 0
                };
                const oldPrice = this.getCurrentPrice(playerId);
                const newPrice = this.calculatePriceFromPerformance(basePrice, performance);
                this.currentPrices.set(playerId, newPrice);
                const priceChange = newPrice - oldPrice;
                const priceChangePercent = oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0;
                priceUpdates.push({
                    playerId,
                    playerName: performance.playerName,
                    oldPrice,
                    newPrice,
                    priceChange,
                    priceChangePercent,
                    performance
                });
            }
            return priceUpdates;
        }
        catch (error) {
            console.error('Error updating prices for game:', error);
            return [];
        }
    }
    // Get all current prices
    getAllCurrentPrices() {
        return new Map(this.currentPrices);
    }
    // Reset prices to base
    resetPrices() {
        this.currentPrices = new Map(this.basePrices);
    }
}
exports.RealPriceEngine = RealPriceEngine;
exports.realPriceEngine = new RealPriceEngine();
