import { Game } from './Game.js';
import { LevelLoader } from './LevelLoader.js';
import { SolarSystemMenu } from './SolarSystemMenu.js';

// --- CONFIGURATION ---
const DEBUG_MODE = false;
const ENFORCE_PROGRESSION = true; // NEW: Toggle progression system on/off
// ---------------------

const menuScreen = document.getElementById('menu-screen');
const endScreen = document.getElementById('end-screen');
const levelList = document.getElementById('level-list');
const canvas = document.getElementById('gameCanvas');
const btnRetry = document.getElementById('btn-retry');
const btnHome = document.getElementById('btn-home');

const game = new Game(canvas);
let solarSystem = null;
let currentLevelData = null;
let allLevels = [];

// NEW: Load completed levels from local storage (so progress persists if you refresh)
let completedLevels = JSON.parse(localStorage.getItem('neonLanderProgress')) || [];

async function init() {
    allLevels = await LevelLoader.loadLevels();

    // NEW: Hook into the game's win state to save progress
    game.onLevelComplete = (levelId) => {
        if (!completedLevels.includes(levelId)) {
            completedLevels.push(levelId);
            localStorage.setItem('neonLanderProgress', JSON.stringify(completedLevels));
        }
    };

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

    // Pass the progression toggle to the menu
    solarSystem = new SolarSystemMenu(canvas, (levelId) => {
        const level = allLevels.find(l => l.id === levelId);
        if (level) {
            startGame(level);
        } else {
            console.error("Level ID not found:", levelId);
        }
    }, ENFORCE_PROGRESSION);

    // Inject the save data
    solarSystem.setProgress(completedLevels);
    solarSystem.start();
}

function startGame(levelData) {
    currentLevelData = levelData;
    if (solarSystem) solarSystem.stop();

    menuScreen.classList.add('hidden');
    endScreen.classList.add('hidden');

    game.start(levelData);
}

function showMainMenu() {
    game.stop();
    menuScreen.classList.remove('hidden');
    endScreen.classList.add('hidden');

    if (DEBUG_MODE) {
        initDebugMenu();
    } else {
        // Ensure menu updates with new brackets/dots if a level was just beaten
        if (solarSystem) {
            solarSystem.setProgress(completedLevels);
            solarSystem.start();
        } else {
            initSolarSystemMenu();
        }
    }
}

// Start application
init();
