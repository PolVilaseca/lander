export class LevelLoader {
    static async loadLevels() {
        try {
            const response = await fetch('./data/levels.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.levels;
        } catch (error) {
            console.error("Could not load levels:", error);
            return [];
        }
    }
}
