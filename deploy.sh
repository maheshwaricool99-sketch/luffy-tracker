#!/bin/bash
set -e
cd /root/luffy-app
npm install
rm -rf .next
npm run build
pm2 reload luffy-tracker --update-env
pm2 save
