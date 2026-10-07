# Sudoku Game Guide

| Desktop view | Mobile view |
| --- | --- |
| <img src="./screenshot_desktop_en.JPG" alt="Sudoku on desktop" width="520" /> | <img src="./screenshot_mobile_en.jpeg" alt="Sudoku on mobile" width="160" /> |

## How to Play

- Select a cell and enter a number from 1 to 9.
- The puzzle is complete when every row, column, and 3x3 block outlined by the thick lines contains each number from 1 to 9 exactly once.
- Every generated puzzle has exactly one solution.
- Duplicate numbers and numbers that have been correctly completed in all nine positions are highlighted.
- You can play offline. Gameplay itself does not require any internet connection.

## Controls and Buttons Above the Board

- `Clues`: Sets the number of starting clues for the next puzzle.
- `Seed`: Enter the same seed to recreate the same puzzle. Leave it empty for a random puzzle.
- `Language`: Switches the interface language.
- `Theme`: Choose `System`, `Light`, or `Dark`. `System` follows your operating system color scheme automatically.
- `Save settings`: When enabled, saves the clue count, seed, language, and theme in this browser. It is off by default.
- `New Puzzle`: Generates a new puzzle with the current clue count and seed.
- `Reset to Start`: Returns the board to its initial state. The timer also starts over.
- `Fill a Hint`: Reveals one correct value in an empty cell.
- `Show Solution`: Displays the completed solution.
- `Save`: Saves the current board, notes, timer, and Undo/Redo history as a JSON file.
- `Load`: Loads a saved JSON file and resumes from the same state.
- `How to Play`: Opens the help dialog. It is available offline.

## Preferences Saved in the Browser

- `Save settings` is off by default, so no preferences are stored in the browser initially.
- When you enable `Save settings`, the enabled state itself plus `Clues`, `Seed`, `Language`, and `Theme` are stored in local storage and restored the next time you open the app.
- Turning `Save settings` off removes all of these saved preferences. If the seed field is blank, no seed value is stored even while preference saving is enabled.
- These preferences are separate from the game-state JSON created by `Save`. The current board, notes, timer, and Undo/Redo history are not autosaved.

## Controls (Mouse / Tap)

- Select a cell on the board.
- Use the number pad to enter a number.
- `Clear`: Clears the selected cell.
- `✏️ Note`: Switches to note input mode. When note input mode is on, entering a number adds a note.
- `🔴 Red Note`: Switches note input to red notes. While note input mode is on, you can also right-click a number with the mouse to enter a red note.
- `↩️ Undo`: Undoes the most recent input or note.
- `↪️ Redo`: Reapplies an undone input or note.

## Controls (Keyboard)

- Arrow keys: Move between cells
- `1` to `9`: Enter a number
- `0` / `Backspace` / `Delete`: Clear the selected cell
- `Enter`: Switch to note input mode
- `Shift+1` to `9`: Enter a red note
- `Ctrl+Z`: Undo
- `Ctrl+Y` or `Ctrl+Shift+Z`: Redo
