#!/bin/bash
# Run this from inside the unzipped smooth-gunner-ext folder
# It will push everything to your GitHub repo

git init
git remote add origin https://github.com/1momoh/X-Unfollow-Detector.git
git add .
git commit -m "🌵 Initial release — 𝕏 Unfollow Detector v9 by .87 @ofalamin"
git branch -M main
git push -u origin main

echo ""
echo "✅ Pushed to https://github.com/1momoh/X-Unfollow-Detector"
