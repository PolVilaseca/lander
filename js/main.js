import { Game } from './Game.js';
import { LevelLoader } from './LevelLoader.js';

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const endScreen = document.getElementById('end-screen');
const levelList = document.getElementById('level-list');
const canvas = document.getElementById('gameCanvas');
const btnRetry = document.getElementById('btn-retry');
const btnHome = document.getElementById('btn-home');
const hud = document.getElementById('hud');

// Game Instance
const game = new Game(canvas);
let currentLevel = null;

async function init() {
    // 1. Load Levels
    const levels = await LevelLoader.loadLevels();

    // 2. Create Level Buttons
    levels.forEach(level => {
        const btn = document.createElement('button');
        btn.className = 'neon-btn';
        btn.innerText = level.name;
        btn.onclick = () => startGame(level);
        levelList.appendChild(btn);
    });

    // 3. Setup Button Listeners
    btnHome.addEventListener('click', showMainMenu);
    btnRetry.addEventListener('click', () => startGame(currentLevel));
}

function startGame(levelData) {
    currentLevel = levelData;

    // UI Updates
    menuScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    // Start Engine
    game.start(levelData);
}

function showMainMenu() {
    game.stop();
    menuScreen.classList.remove('hidden');
    endScreen.classList.add('hidden');
    hud.classList.add('hidden');
}

// Start the application
init();
