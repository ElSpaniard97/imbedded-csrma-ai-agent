# Deployment Guide

This guide will help you deploy the AI Infrastructure Troubleshooting Agent showcase site to GitHub Pages.

---

## 📋 Prerequisites

- GitHub account
- Git installed on your computer (or use GitHub's web interface)
- Repository created on GitHub

---

## 🚀 Quick Deployment (GitHub Web Interface)

### Step 1: Upload Files
1. Go to your GitHub repository
2. Click **Add file** → **Upload files**
3. Upload all files maintaining the structure:
   ```
   ├── index.html
   ├── capabilities.html
   ├── workflow.html
   ├── prompts.html
   ├── faq.html
   ├── README.md
   ├── CHANGELOG.md
   └── assets/
       ├── css/
       │   └── main.css
       └── js/
           ├── main.js
           └── prompts.js
   ```
4. Commit the changes

### Step 2: Enable GitHub Pages
1. Go to **Settings** in your repository
2. Scroll down to **Pages** section (left sidebar)
3. Under **Source**, select:
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
4. Click **Save**
5. Wait 1-2 minutes for deployment

### Step 3: Access Your Site
Your site will be available at:
```
https://[your-username].github.io/[repository-name]/
```

---

## 💻 Deployment via Git Command Line

### Step 1: Clone Repository (if needed)
```bash
git clone https://github.com/[username]/[repository-name].git
cd [repository-name]
```

### Step 2: Add Files
Copy all files to the repository directory maintaining the structure.

### Step 3: Commit and Push
```bash
# Add all files
git add .

# Commit
git commit -m "Deploy AI Infrastructure Troubleshooting Agent showcase site"

# Push to GitHub
git push origin main
```

### Step 4: Enable GitHub Pages
Follow Step 2 from the "Quick Deployment" section above.

---

## 🔧 Customization Before Deployment

### Update Agent URL
If you have a different GPT URL, update it in:

**File: `assets/js/main.js`** (line ~14)
```javascript
const AGENT_URL = "YOUR_GPT_URL_HERE";
```

**Files to update the link in HTML:**
- `index.html`
- `capabilities.html`
- `workflow.html`
- `prompts.html`
- `faq.html`
- `README.md`

Search for:
```
https://chatgpt.com/g/g-69441b1b5d0c81918300df5e63b0e079-ai-infrastructure-troubleshooting-agent
```

Replace with your GPT URL.

### Update Branding
**Site Title & Subtitle** - Update in all HTML files:
```html
<div class="brand-title">Your Agent Name</div>
<div class="brand-subtitle">Your Tagline</div>
```

**Page Titles** - Update `<title>` tags in all HTML files

**Logo Mark** - Update in all HTML files:
```html
<div class="mark">AI</div>
```

### Update Content
- **Capabilities**: Edit `capabilities.html`
- **Workflow**: Edit `workflow.html`
- **Prompts**: Edit `prompts.html` (add/remove prompt cards)
- **FAQ**: Edit `faq.html`

---

## 🧪 Local Testing

### Option 1: Python HTTP Server
```bash
# Navigate to repository directory
cd [repository-name]

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Open browser to http://localhost:8000
```

### Option 2: Node.js HTTP Server
```bash
# Install http-server globally (once)
npm install -g http-server

# Run in repository directory
http-server -p 8000

# Open browser to http://localhost:8000
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] Site loads at GitHub Pages URL
- [ ] All pages accessible (Home, Capabilities, Workflow, Prompts, FAQ)
- [ ] Navigation works between pages
- [ ] Theme toggle works (dark ↔ light)
- [ ] Copy buttons work (agent link, prompts)
- [ ] Toast notifications appear
- [ ] Mobile navigation works
- [ ] Search/filter works on Prompts page
- [ ] All links to GPT work correctly
- [ ] No console errors (check browser DevTools)
- [ ] Responsive design works on mobile
- [ ] CSS and JS files load correctly (no 404s)

---

## 🐛 Troubleshooting

### Site Shows 404 Error
**Problem**: GitHub Pages not enabled correctly

**Solution**:
1. Go to Settings → Pages
2. Ensure Source is set to `main` branch and `/ (root)` folder
3. Save and wait 1-2 minutes
4. Force refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### CSS/JS Not Loading
**Problem**: Incorrect file paths

**Solution**:
1. Verify folder structure exactly matches guide
2. Ensure files are in `assets/css/` and `assets/js/`
3. Check file names are lowercase
4. Verify HTML references: `./assets/css/main.css`

### Theme Not Persisting
**Problem**: localStorage blocked (private browsing)

**Solution**: This is expected behavior in private/incognito mode. Theme will work but won't persist.

### Copy Buttons Not Working
**Problem**: Browser doesn't support Clipboard API

**Solution**: The code includes a fallback using `execCommand`. Update browser to latest version.

### Mobile Menu Not Working
**Problem**: JavaScript not loading

**Solution**:
1. Check browser console for errors
2. Verify `assets/js/main.js` exists and loads
3. Clear browser cache

---

## 🔄 Updating Your Site

### Update Content
1. Edit the HTML/CSS/JS files locally
2. Test changes locally
3. Commit and push:
   ```bash
   git add .
   git commit -m "Update [description]"
   git push origin main
   ```
4. Wait 1-2 minutes for GitHub Pages to rebuild
5. Hard refresh your browser

### Update GPT URL
1. Update `AGENT_URL` in `assets/js/main.js`
2. Update all HTML files (search for old URL)
3. Update `README.md`
4. Commit and push changes

---

## 📊 Analytics (Optional)

### Add Google Analytics
Add to `<head>` of all HTML files:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR-GA-ID');
</script>
```

---

## 🔒 Security Notes

- No server-side code, fully static
- No user data collection
- No cookies (except localStorage for theme)
- All external links use `rel="noreferrer"`
- Safe for public deployment

---

## 📞 Support

### GitHub Pages Documentation
https://docs.github.com/en/pages

### Issues?
Check the CHANGELOG.md for known issues and solutions.

---

## 🎉 Success!

Your site should now be live at:
```
https://[your-username].github.io/[repository-name]/
```

Share it with your team and users!
