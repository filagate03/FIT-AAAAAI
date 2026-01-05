
import { AppState } from '../types';

const STORAGE_KEY = 'fit-ai-app-state';

export const saveState = (state: AppState): void => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, serializedState);
    } catch (error) {
        console.error("Could not save state to localStorage", error);
    }
};

export const loadState = (): AppState | null => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return null;
        }
        return JSON.parse(serializedState);
    } catch (error) {
        console.error("Could not load state from localStorage", error);
        return null;
    }
};
