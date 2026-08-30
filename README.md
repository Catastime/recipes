# Recipes

A minimalist, step-by-step recipe viewer built as a static site for GitHub Pages. No frameworks, no build step, no photos, just plain vector icons.

## How it works

- `data/manifest.json` lists every recipe: id, title, total time.
- `data/recipes/<id>.json` holds one recipe's steps. Each step has a title, a time in minutes, an `instruction`, and an `icon` field containing a self-contained inline SVG (drawn in a single-stroke line style, no fill, styled via `style.css`).
- `index.html` / `style.css` / `app.js` render everything client-side. Recipes are loaded on demand and cached in memory.

## Navigation

- Swipe left/right on mobile to move between steps.
- On desktop, click the left or right half of the screen (or use the arrow keys) to move between steps.
- The menu button opens a sidebar with search and an alphabetical list of every recipe.

## Adding a recipe

Add a new file to `data/recipes/`, and add its id/title/time to `data/manifest.json`. No other changes needed.
