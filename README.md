# JANVIER Ecom Photo Studio

> Professional fashion photography, powered by AI.

A private team tool that transforms garment reference photos into polished e-commerce product images using the Gemini API.

---

## Modes

| Mode | Name | What it does |
|------|------|-------------|
| **A** | Layflat | Generates an overhead flat-lay on pure white (#FFFFFF) |
| **B** | Detail Close-up | Generates a cropped texture/craft close-up shot |
| **C** | Full Set | Runs both A and B in parallel and delivers both images |

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Add your Gemini API key

Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey), then open `.env.local` and replace the placeholder:

```
GEMINI_API_KEY=your_actual_key_here
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploy to Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/janvier-ecom-photo-studio.git
git push -u origin main
```

> **Important:** `.env.local` is in `.gitignore` and will NOT be committed. Your API key stays safe.

### Step 2 — Import on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Import your GitHub repository
4. Click **Deploy** (Vercel will auto-detect Next.js)

### Step 3 — Add the API key in Vercel

1. Go to your project on Vercel
2. Click **Settings → Environment Variables**
3. Add a new variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your actual Gemini API key
   - **Environment:** Production (and Preview if desired)
4. Click **Save**
5. Redeploy the project: **Deployments → Redeploy**

### Step 4 — Share the URL

Once deployed, Vercel gives you a URL like:
```
https://janvier-ecom-photo-studio.vercel.app
```

Share this URL with your team. No login required — just open and use.

---

## How to Use

1. **Upload** your garment photo (JPG, PNG, or WEBP, max 8MB)
2. **Select a mode** — Layflat, Detail Close-up, or Full Set
3. Click **Generate** and wait 20–30 seconds
4. **Download** your result image(s)
5. Click **Try Another** to start fresh

---

## Tech Stack

- **Next.js 14** (App Router) — frontend + API routes
- **Gemini API** — `gemini-2.0-flash-preview-image-generation` for image transformation
- **Tailwind CSS** — minimal, clean styling
- **Vercel** — deployment and hosting

---

## Notes

- The Gemini API key is stored **server-side only** and is never exposed to the browser.
- Mode C runs two Gemini API calls in parallel — it takes the same time as a single call.
- For best results, use clear photos of the garment against any background (hanger shots work great).
- If Vercel Hobby plan's 10s function timeout is hit, upgrade to Vercel Pro for 60s timeout.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key. Get one at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
