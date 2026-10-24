# KAM PPT — Smarter Tomorrow

A responsive, single-page study assistant. The app includes explain-and-notes generation, text summaries, multiple-choice quizzes and scoring, flashcards, an AI tutor, a 7-day study timetable, a focus timer, performance and history views, 14 languages, and neon-dark/light themes.

## Run locally

This is a static site with no build step or package installation. Open `index.html` in a modern browser, or serve the repository directory:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

AI generation uses a free Pollinations text endpoint by default; an optional Anthropic key can be entered under **Settings** to use Anthropic instead. Both services receive the prompts you submit. The optional key is stored in the current browser's `localStorage` and sent directly to Anthropic from that browser; never enter a key on a shared or untrusted device. The static application has no server-side key storage. If a provider or network is unavailable, the app displays the error and keeps your local study data.

## Deploy to Netlify

1. Push the repository to GitHub and import it in Netlify using **Add new site → Import an existing project**.
2. Leave the build command blank and set the publish directory to `.`.
3. Deploy. The `netlify.toml` file also sets the publish directory.

For a quick manual deployment, drag the project folder into Netlify Drop.

## Data storage

Study history, scores, focus totals, timetable, flashcards, tutor conversation, theme, language, and the optional API key are kept in browser `localStorage`. **Settings → Clear all my data** removes saved app data from that browser. This project includes no backend or analytics.
