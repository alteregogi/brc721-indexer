Latest supported Bitcoin Node version: 25

# Prerequisite

1. machine with 4 GB RAM and 700 GB storage
2. PostgreSQL database with 2GB RAM

# Setup Bitcoin Node

Follow this tutorial to set up a full Bitcoin Node.
https://medium.com/@eallam/how-im-running-a-bitcoin-full-node-on-digital-ocean-for-40-a-month-dfc328ba9604

Wait for the node to sync. To check run `bitcoin-cli -getinfo` in the droplet console.
You should get `Verification progress: 100.0000%`, meaning the node is in sync.

# Setup Redis on the same machine

Follow steps 1 and 2.
https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-20-04

# Setup Indexer

1. Clone this repository to the machine with Bitcoin Node
2. Go to the repository directory
3. Rename .env.example to .env and set environment variables
4. Run `npm i`, `npm run build` and `npm start` to start indexer

We recommend to use [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/) to have autorestarts stratagy and healthcheck notifications

TODO: lock version, remote/local RPC, testnet conf, pm2-health
