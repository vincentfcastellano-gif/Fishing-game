# Kloten Fishing: shared leaderboard

A fishing game where every friend plays on their own phone and all catches land on one live leaderboard.

- `public/index.html` is the game (one file, no build step)
- `netlify/functions/scores.mjs` is the backend (stores scores in Netlify Blobs)
- `netlify.toml` and `package.json` tell Netlify where things are

## Deploy (about 10 minutes)

Netlify needs the whole folder, not just the HTML file, because of the backend function.
Dragging only index.html onto Netlify Drop will NOT give you the leaderboard.

### Option A: GitHub (recommended)
1. Create a new GitHub repository and upload everything in this folder.
2. In Netlify: Add new site > Import an existing project > pick the repository.
3. Leave the build settings as they are (netlify.toml sets them) and deploy.
4. Open the site address Netlify gives you and send it to your friends.

### Option B: Netlify command line
1. Install Node.js, then run: npm install -g netlify-cli
2. In this folder run: netlify login
3. Then: netlify init (create a new site)
4. Then: netlify deploy --prod

## Try it on your computer first
In this folder run: netlify dev
Open the address it prints. Scores are stored in a local sandbox, not on the live site.

## Optional: a PIN to clear test scores
1. Netlify site settings > Environment variables > add RESET_PIN with a PIN of your choice.
2. Redeploy the site.
3. In the game, open "Organizer tools" under the leaderboard, enter the PIN and press Clear all scores.
Without RESET_PIN the clear button is disabled, so nobody can wipe the scores by accident.

## Good to know
- Friends type a name once. The same name means the same angler.
- If a phone loses signal (likely in the forest), its catches wait on the device and sync when it is back online.
- The server checks every catch (species, weight, length) and recalculates points, but it cannot stop a determined friend from faking a request. That is fine for friends.
- Anyone with the link can play and post scores. Don't share the link publicly.
- Check Netlify's pricing page for current free-plan limits. A handful of friends fishing for a weekend should be tiny.
