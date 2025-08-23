#!/bin/bash

echo "No arguments were passed, then will setup the server"

sudo su -
export DEBIAN_FRONTEND=noninteractive

apt-get install nginx
systemctl start nginx
cp ~/iac/nginx/nginx.conf /etc/nginx/nginx.conf
cp ~/iac/nginx/default-server.conf /etc/nginx/sites-available/default

ufw allow 'Nginx HTTP' 
ufw allow 'Nginx HTTPS'
ufw enable
systemctl restart nginx

# Additional commands for application setup
rm -f ~/.pm2/logs/*
npm install --production
NODE_ENV=production pm2 restart app --update-env || NODE_ENV=production pm2 start src/main.js --name app --update-env
pm2 save # save the current PM2 process list to ensure that your application restarts on boot
sudo pm2 startup # Generate Startup Script so it restarts on boot


# Setup the frontend app
cd intesab-frontend
NODE_ENV=production npm run build
rm -r /var/www/html/* && mv dist/* /var/www/html
# cp -r dist/* /var/www/html/