"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLASH_MULTIPLIER_DURATION = exports.PRICE_UPDATE_INTERVAL = exports.LIVE_TRADES_LIMIT = exports.INITIAL_BALANCE = exports.TEAMS = exports.POSITIONS = void 0;
// Constants
exports.POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
exports.TEAMS = [
    'LAL', 'GSW', 'MIL', 'DAL', 'BOS', 'PHI', 'DEN', 'BRK', 'POR', 'MIA',
    'LAC', 'PHX', 'UTA', 'ATL', 'CHI', 'MEM', 'NYK', 'MIN', 'NOP', 'SAS',
    'WAS', 'SAC', 'IND', 'CLE', 'TOR', 'ORL', 'CHA', 'DET', 'OKC', 'HOU'
];
exports.INITIAL_BALANCE = 10000;
exports.LIVE_TRADES_LIMIT = 5;
exports.PRICE_UPDATE_INTERVAL = 10000; // 10 seconds
exports.FLASH_MULTIPLIER_DURATION = 30000; // 30 seconds
