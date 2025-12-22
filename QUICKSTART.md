# Quick Start Guide

Get your AI Infrastructure Troubleshooting Agent showcase site live in **5 minutes**!

---

## 🚀 Super Quick Deploy (2 Minutes)

### Option 1: GitHub Web Upload (Easiest)

1. **Go to GitHub** → Create new repository (or use existing)
2. **Click "Add file"** → "Upload files"
3. **Drag and drop** all files/folders from the cleaned-repo
4. **Commit** changes
5. **Settings** → **Pages** → Source: `main` → Folder: `/` → **Save**
6. **Wait 1 minute** → Your site is live! 🎉

**Done!** Visit: `https://[username].github.io/[repo-name]/`

---

## 📁 What You're Deploying

```
✅ 5 HTML pages (Home, Capabilities, Workflow, Prompts, FAQ)
✅ 1 CSS file (complete styling, dark/light theme)
✅ 2 JS files (all functionality)
✅ 4 Documentation files (README, CHANGELOG, DEPLOYMENT, COMPARISON)
```

**Total size**: ~25KB
**Build required**: No
**Dependencies**: Zero
**Just works**: Yes! ✅

---

## 🎨 Customization (5 Minutes)

### Change GPT URL

**File**: `assets/js/main.js` (line 14)
```javascript
const AGENT_URL = "YOUR_GPT_URL_HERE";
```

**Also update in** all HTML files:
- Search: `https://chatgpt.com/g/g-69441b1b...`
- Replace: Your GPT URL

### Change Branding

**All HTML files** - Update:
```html
<div class="brand-title">Your Agent Name</div>
<div class="brand-subtitle">Your Tagline</div>
```

### Change Logo
**All HTML files** - Update:
```html
<div class="mark">AI</div>  <!-- Change "AI" to your initials -->
```

---

## ✅ Verification Checklist

After deployment, test:

- [ ] Site loads at GitHub Pages URL
- [ ] Theme toggle works (sun/moon button)
- [ ] All 5 pages accessible
- [ ] Copy buttons work
- [ ] Mobile menu works (on phone)
- [ ] Prompt filtering works
- [ ] No console errors (F12 → Console)

---

## 🐛 Quick Troubleshooting

### Site Shows 404
**Fix**: Settings → Pages → Ensure source is `main` branch, `/` root
**Wait**: 1-2 minutes after enabling Pages

### CSS Not Loading
**Fix**: Verify folder structure:
```
assets/
  css/
    main.css
  js/
    main.js
    prompts.js
```

### Theme Not Working
**Fix**: Check browser console (F12) for errors
**Note**: Theme won't persist in private/incognito mode (expected)

---

## 📖 Full Documentation

- **DEPLOYMENT.md** - Comprehensive deployment guide
- **README.md** - Full project documentation  
- **CHANGELOG.md** - All changes and improvements
- **COMPARISON.md** - Before/after analysis

---

## 🎯 Next Steps

1. ✅ Deploy site (you're done!)
2. 📝 Customize branding
3. ✏️ Edit prompt library
4. 📱 Share with your team
5. 🎉 Celebrate!

---

## 💡 Pro Tips

### Local Testing
```bash
python -m http.server 8000
# Visit: http://localhost:8000
```

### Update Content
1. Edit HTML/CSS/JS files
2. Commit and push to GitHub
3. GitHub Pages auto-rebuilds
4. Hard refresh browser (Ctrl+Shift+R)

### Add Prompts
Edit `prompts.html`:
```html
<article class="card prompt-card" 
         data-category="network" 
         data-keywords="your keywords here">
  <div class="row">
    <div class="card-title">Your Prompt Title</div>
    <button class="btn btn-ghost btn-sm copy-btn" 
            data-copy="Your prompt text here">Copy</button>
  </div>
  <pre class="code">Your prompt text here</pre>
</article>
```

Categories: `network`, `server`, `script`, `hardware`

---

## 🆘 Need Help?

1. Check **DEPLOYMENT.md** for detailed troubleshooting
2. Check browser console (F12) for errors
3. Verify file structure matches exactly
4. Try hard refresh (Ctrl+Shift+R)
5. Clear browser cache

---

## ✨ You're All Set!

Your professional AI agent showcase site is now live and ready to share.

**What you get:**
- ✅ Modern, responsive design
- ✅ Dark/light theme toggle
- ✅ Mobile-friendly
- ✅ Searchable prompt library
- ✅ One-click copying
- ✅ Zero maintenance
- ✅ Free hosting on GitHub Pages

**Share your site URL:**
```
https://[your-username].github.io/[repository-name]/
```

🎉 **Congratulations!** 🎉
