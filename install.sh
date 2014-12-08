#!/bin/bash

#install node
git clone https://github.com/joyent/node.git
cd node
./configure
make
make install

#install mongoDB
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install -y mongodb-org

#run mongoDB
sudo service mongod start

#install node runner
npm i -g forever

#install application dependencies
cd /var/www/chat/
npm i

#run the application
forever start server.js

exit 0