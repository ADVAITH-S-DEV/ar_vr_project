/**
 * GameState.js
 * Central state machine governing the flow.
 * Ensures O(1) state transitions.
 */
export class GameState {
    constructor() {
        this.currentState = 'MAIN_MENU';
    }

    setState(newState) {
        this.currentState = newState;
    }

    update() {
        // State updates executed in O(1) time
    }
}
