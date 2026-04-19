# MCQ Test Portal — Complete Setup & Deployment Guide

## What You're Building
- Student registration (name, college, phone, email, subject)
- 100 MCQ test, paginated 10/page, 1-hour timer
- Max 2 attempts per student — both scores stored separately
- Supabase database (you can view all students + scores)
- Top 3 leaderboard
- Deployed on Vercel (free)

---

## STEP 1: Set Up Supabase (Database)

1. Go to **https://supabase.com** and sign up (free)
2. Click **"New Project"**
   - Give it any name (e.g. "mcq-test")
   - Set a database password (save it!)
   - Choose a region (Asia Southeast for Nepal)
3. Wait ~2 minutes for the project to be created
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. **Copy the entire contents of `SUPABASE_SETUP.sql`** and paste it → Click **Run**
6. You should see "Success" — your tables are ready!

### Get Your API Keys:
- Go to **Settings** (gear icon, bottom left) → **API**
- Copy:
  - **Project URL** → looks like `https://abcdefgh.supabase.co`
  - **anon public key** → long string starting with `eyJ...`

---

## STEP 2: Add Your 100 Questions

Replace `public/questions.csv` with your actual questions.

**Required CSV format** (exactly these column names):
```
sn,question,optionA,optionB,optionC,optionD,answer
1,What is 2+2?,1,2,4,8,C
2,Capital of Nepal?,Pokhara,Kathmandu,Biratnagar,Dharan,B
```

- **answer** column must be exactly `A`, `B`, `C`, or `D`
- All 6 columns are required for every row
- Save the file as UTF-8 encoding

---

## STEP 3: Push Code to GitHub

1. Go to **https://github.com** → New Repository
2. Name it `mcq-test-portal` (or anything)
3. Keep it **Private** (your questions will be there)
4. Open terminal in the `mcq-test-app` folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mcq-test-portal.git
git push -u origin main
```

---

## STEP 4: Deploy on Vercel

1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **"Add New Project"**
3. Import your `mcq-test-portal` GitHub repository
4. Vercel auto-detects Create React App — no build settings needed
5. **Before clicking Deploy**, add Environment Variables:
   - Click **"Environment Variables"**
   - Add:
     ```
     Name:  REACT_APP_SUPABASE_URL
     Value: https://your-project-id.supabase.co
     ```
   - Add:
     ```
     Name:  REACT_APP_SUPABASE_ANON_KEY
     Value: your-anon-key-here
     ```
6. Click **Deploy** — done in ~2 minutes!
7. Vercel gives you a URL like `https://mcq-test-portal.vercel.app`

---

## STEP 5: Share with Students

Share your Vercel URL. That's it!

Students can:
- Register with their details
- Take the test (up to 2 times)
- View their result instantly
- See the leaderboard

---

## Viewing Results (Admin)

Go to **Supabase Dashboard → Table Editor**:

### See all students:
→ `students` table — all registrations

### See all scores (including both attempts side by side):
→ `student_results` view — perfect for exports

### See top 3:
→ `leaderboard` view

### Export to Excel/CSV:
In any table/view, click the **Download** button (⬇ icon)

---

## Updating Your Questions Later

Just replace `public/questions.csv` and push to GitHub:
```bash
git add public/questions.csv
git commit -m "Updated questions"
git push
```
Vercel will auto-redeploy in ~1 minute.

---

## Important Notes

- The questions CSV must be in `public/questions.csv` exactly
- Students are identified by **email OR phone** — either one re-identifies them
- A student who enters the same email/phone again will continue with attempt 2 (or be blocked if both used)
- The 1-hour timer auto-submits when time runs out
- All 100 questions are shuffled in the order you provide in the CSV

---

## Project File Structure

```
mcq-test-app/
├── public/
│   ├── index.html
│   └── questions.csv          ← PUT YOUR QUESTIONS HERE
├── src/
│   ├── lib/
│   │   └── supabase.js        ← Supabase client
│   ├── pages/
│   │   ├── RegisterPage.js    ← Student registration
│   │   ├── TestPage.js        ← The actual test
│   │   ├── ResultPage.js      ← Score display
│   │   └── LeaderboardPage.js ← Top 3
│   ├── App.js
│   ├── App.css
│   └── index.js
├── SUPABASE_SETUP.sql          ← Run this in Supabase SQL Editor
├── vercel.json                 ← Routing config for Vercel
├── .env.example                ← Template for env variables
└── package.json
```
