import { Game } from './Game.js';
import { LevelLoader } from './LevelLoader.js';
import { SolarSystemMenu } from './SolarSystemMenu.js';

// --- CONFIGURATION ---
const DEBUG_MODE = false;
// ---------------------

const menuScreen = document.getElementById('menu-screen');
const endScreen = document.getElementById('end-screen');
const levelList = document.getElementById('level-list');
const canvas = document.getElementById('gameCanvas');
const btnRetry = document.getElementById('btn-retry');
const btnHome = document.getElementById('btn-home');

// Removed: const hud = document.getElementById('hud'); // No longer exists in HTML

const game = new Game(canvas);
let solarSystem = null;
let currentLevelData = null;
let allLevels = [];

async function init() {
    allLevels = await LevelLoader.loadLevels();

    if (DEBUG_MODE) {
        initDebugMenu();
    } else {
        initSolarSystemMenu();
    }

    btnHome.addEventListener('click', showMainMenu);
    btnRetry.addEventListener('click', () => {
        if (currentLevelData) startGame(currentLevelData);
    });
}

function initDebugMenu() {
    levelList.innerHTML = '';
    levelList.style.display = 'block';

    const instructionText = menuScreen.querySelector('p');
    if(instructionText) instructionText.style.display = 'block';

    allLevels.forEach(level => {
        const btn = document.createElement('button');
        btn.className = 'neon-btn';
        btn.innerText = `[DEBUG] ${level.name}`;
        btn.onclick = () => startGame(level);
        levelList.appendChild(btn);
    });
}

function initSolarSystemMenu() {
    levelList.style.display = 'none';

    const instructionText = menuScreen.querySelector('p');
    if(instructionText) instructionText.style.display = 'none';

    solarSystem = new SolarSystemMenu(canvas, (levelId) => {
        const level = allLevels.find(l => l.id === levelId);
        if (level) {
            startGame(level);
        } else {
            console.error("Level ID not found:", levelId);
        }
    });

    solarSystem.start();
}

function startGame(levelData) {
    currentLevelData = levelData;
    if (solarSystem) solarSystem.stop();

    menuScreen.classList.add('hidden');
    endScreen.classList.add('hidden');

    // Removed: hud.classList.remove('hidden');

    game.start(levelData);
}

function showMainMenu() {
    game.stop();
    menuScreen.classList.remove('hidden');
    endScreen.classList.add('hidden');

    // Removed: hud.classList.add('hidden');

    if (DEBUG_MODE) {
        // Debug mode logic
    } else {
        if (solarSystem) solarSystem.start();
    }
}

init();
