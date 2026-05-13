# Marvel Cards

A small vanilla app for building decks from reusable modules and tracking draws during play.

## What it does

- Create reusable module presets with a name, card count, and accent color
- Edit or delete module presets from the module library
- Keep modules and decks in separate collapsible areas
- Create decks with custom names, then move one deck at a time into the play area
- Tap the active play deck to draw from the next available module
- Track remaining cards per module and block draws from empty modules
- Add modules to the active deck during play
- Reshuffle a deck only after every module in that deck is empty

## Run locally

Open `index.html` in a browser, or use any static file server.

## Notes

- The app persists module presets, decks, and the current game state in browser `localStorage`.
- Multiple decks are supported at the same time, with one deck selected for the play area.
- Decks are available immediately after creation and can be expanded or collapsed independently.
