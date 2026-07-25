# Deploying

One-time setup, about 10 minutes. After this, every `git push` deploys itself.

---

## Step 0 — Check you have git

Open PowerShell and run:

```powershell
git --version
```

If it errors, install from https://git-scm.com/download/win, accept every default,
then **close and reopen PowerShell**.

---

## Step 1 — Make this folder a git repo

```powershell
cd "C:\Users\balde\Downloads\CMB Transformations\booking-site"
git init
git add .
git commit -m "Layer 1: landing page and design system"
```

> Run these inside `booking-site`, not the parent folder. That keeps your
> progress photos and planning docs out of the repo, and means Vercel doesn't
> need a Root Directory setting.

If git asks who you are, run these once and then redo the commit:

```powershell
git config --global user.name "Charles Balderas"
git config --global user.email "carlosbalderas135@gmail.com"
```

---

## Step 2 — Push to GitHub

1. Go to https://github.com/new
2. Repository name: `cmb-booking`
3. **Set it to Private.** Your API keys go in Vercel, not the repo, but private is
   the right default for a business project.
4. Do **not** check "Add a README" — you already have files.
5. Click Create, then run what GitHub shows you, which will look like:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/cmb-booking.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Import to Vercel

1. Go to https://vercel.com/signup and sign in **with GitHub**
2. Click **Add New → Project**
3. Find `cmb-booking` and click **Import**
4. Vercel auto-detects Next.js. Change nothing.
5. Click **Deploy**

About a minute later you get a URL like `cmb-booking.vercel.app`.

---

## Step 4 — Open it on your actual phone

Text yourself the URL and open it. This is the point of deploying early — the
emulator in desktop DevTools does not tell you how the gradient reads on a real
OLED screen, or whether the buttons feel right under your thumb.

Check specifically:

- [ ] Background gradient looks right, no banding
- [ ] Headline doesn't wrap awkwardly
- [ ] Sticky button appears when you scroll, disappears over the booking section
- [ ] "Book my free session" jumps to the booking section
- [ ] FAQ items open and close
- [ ] Nothing scrolls sideways

---

## From here on

```powershell
git add .
git commit -m "what changed"
git push
```

Live in about 60 seconds. Every push also gets its own preview URL, so you can
compare before and after.

---

## Search engines

The site currently tells Google **not** to index it — correct, since the booking
calendar is still a placeholder.

When you're ready to launch, in Vercel go to **Settings → Environment Variables**
and add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_ALLOW_INDEXING` | `true` |

Then redeploy. Until you do that, you can share the link with anyone directly and
it works fine — it just won't show up in search results.

---

## Your domain

Buy it now even though you're not pointing it here yet. Two reasons: DNS changes
take time to propagate, and Resend needs verified DNS records on your domain
before it will send confirmation emails in Layer 5. Starting that clock early
means it's done before you need it.

Cloudflare or Namecheap, roughly $12/year. When ready: Vercel → Settings →
Domains → Add, and follow the DNS instructions it gives you.

---

## If the build fails on Vercel

It shouldn't — the production build passes locally. But if it does, open the
failed deployment in Vercel and read the log. The error is almost always a typo
in a component. You can reproduce it locally with:

```powershell
npm run build
```

That runs the exact same thing Vercel does, and is worth running before any push.
