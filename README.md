# Upboard Playground

Free browser brain games and daily puzzles — 23 games, no app, no sign-up.

Play logic, word, maths and GK games in one place. Earn XP and gems, keep a daily streak, and switch between a shared daily puzzle and unlimited practice.

## Play

```bash
cd Upboard
npm start
```

Then open [http://localhost:8080](http://localhost:8080).

Or double-click `start.bat` on Windows.

## Games

**Logic** — 2048, Sudoku, Nonogram, Pipes, Queens, Zip  
**Words** — Word Guess, Connections, Spelling Bee, Word Search, Keyword, Emoji Rebus, Synonyms & Antonyms  
**Maths** — Math Sprint, 24 Game  
**Quiz & study** — GK Quiz, True or False, Flags & Capitals, Higher or Lower, Colour Clash, Number Sequence, Mirror Image, Periodic Table Memory  

## Features

- Daily mode (same puzzle for everyone that day) and Practice mode
- XP, gems and streak saved in this browser
- Works on phone and desktop

## Deploy on Netlify

This is a static site. Do **not** use `npm start` as the build command (that only runs a local server).

1. Push this repo to GitHub.
2. On [Netlify](https://app.netlify.com): **Add new site → Import an existing project → GitHub → Upboard**.
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Click **Deploy**.

`netlify.toml` in the repo already sets these values. After deploy you get a URL like `https://something.netlify.app`.


**Short description (About box):**

`23 free browser brain games — daily puzzles, XP and streaks. No app, no sign-up.`

**Topics:** `games` `puzzle` `education` `javascript` `html5` `css` `brain-games` `sudoku` `wordle`
