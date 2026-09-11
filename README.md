# Neon Hosted Checkout Demo

A small web application demonstrating a complete Neon Hosted Checkout flow from checkout creation through webhook-based fulfillment.

## Live Demo

https://neon-checkout-demo-production.up.railway.app

The demo uses:

- Player: `gamer-kyle`
- Item: `100 Gold Coins`
- SKU: `gold-coins-100`
- Price: `$1.99`
- Environment: Neon Sandbox

## How It Works

1. The player clicks **Buy Now**.
2. The frontend calls the backend to create a checkout session.
3. The backend calls the Neon Checkout API using the server-side API key.
4. The player is redirected to Neon Hosted Checkout.
5. After payment, Neon sends a `purchase.completed` webhook.
6. The webhook signature is verified using `x-neon-digest`.
7. The purchased SKU and player account are validated.
8. The Gold Coins are granted.
9. The success page confirms fulfillment for that specific checkout.

## Tech Stack

- Node.js
- Express
- HTML / JavaScript
- Neon Hosted Checkout
- Neon Webhooks
- Railway

## Running Locally

Install dependencies:

```bash
npm install
```

Create a `.env` file using `.env.example`:

```env
NEON_API_KEY=your_neon_sandbox_api_key
NEON_WEBHOOK_SECRET=your_webhook_secret
NEON_WEBHOOK_URL=https://your-public-url/webhook
```

Start the application:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

A public HTTPS endpoint is required for Neon to reach the local webhook. After setting `NEON_WEBHOOK_URL`, register it with:

```bash
npm run register-webhook
```

## Implementation Notes

Checkout sessions are created on the server so the Neon API key is never exposed to the browser.

Fulfillment is triggered by the verified `purchase.completed` webhook rather than the success-page redirect. The checkout ID returned by Neon is stored in the browser and matched against `purchase.checkoutId` so the success page can confirm the exact purchase.

Processed purchase IDs are tracked to prevent the same webhook from granting an item twice.

For simplicity, player balances, processed purchases, and fulfilled checkout IDs are stored in memory. A production implementation would use persistent database storage, so this demo resets its state whenever the server restarts or is redeployed.

## Demo Inventory

The current in-memory Gold Coin balance can be checked at:

https://neon-checkout-demo-production.up.railway.app/player/gamer-kyle

Example response:

```json
{
  "goldCoins": 100
}
```

Because this demo uses in-memory storage, the balance resets if the server restarts or is redeployed.

## Project Files

```text
index.html
script.js
server.js
register-webhook.js
package.json
package-lock.json
Dockerfile
.env.example
.gitignore
.dockerignore
README.md
```

## Security

Real API keys and webhook secrets are stored in environment variables and are not committed to the repository.

The local `.env` file is excluded through `.gitignore`, while `.env.example` only contains placeholder values.