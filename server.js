const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`;

app.use(express.json());
app.use(express.static(__dirname));

const players = {
    "gamer-kyle": {
        goldCoins: 0
    }
};

const processedPurchases = new Set();
const fulfilledCheckouts = new Set();

app.post("/create-checkout", async (req, res) => {
    try {
        const response = await fetch("https://api.neonpay.com/checkout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-API-KEY": process.env.NEON_API_KEY
            },
            body: JSON.stringify({
                items: [
                    {
                        sku: "gold-coins-100",
                        name: "100 Gold Coins",
                        quantity: 1,
                        price: 199
                    }
                ],
                accountId: "gamer-kyle",
                languageLocale: "en-US",
                playerCountry: "US",
                currency: "USD",
                successUrl: `${BASE_URL}/success`,
                cancelUrl: `${BASE_URL}/`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Neon checkout creation failed:", data);
            return res.status(response.status).json({
                error: "Failed to create checkout"
            });
        }

        if (!data.id || !data.redirectUrl) {
            console.error("Unexpected Neon response:", data);
            return res.status(500).json({
                error: "Invalid checkout response"
            });
        }

        console.log(`Checkout created: ${data.id}`);

        res.json({
            checkoutId: data.id,
            redirectUrl: data.redirectUrl
        });
    } catch (error) {
        console.error("Checkout error:", error);
        res.status(500).json({
            error: "Server error"
        });
    }
});

function verifyNeonSignature(eventData, receivedSignature) {
    if (!receivedSignature || typeof receivedSignature !== "string") {
        return false;
    }

    const expectedSignature = crypto
        .createHmac("sha256", process.env.NEON_WEBHOOK_SECRET)
        .update(eventData)
        .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(receivedSignature, "hex");

    if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

app.post("/webhook", (req, res) => {
    const eventData = JSON.stringify(req.body);
    const receivedSignature = req.headers["x-neon-digest"];

    if (!verifyNeonSignature(eventData, receivedSignature)) {
        console.warn("Rejected webhook with invalid signature");
        return res.status(403).send("Invalid event signature");
    }

    if (req.body.type !== "purchase.completed") {
        return res.status(200).send("OK");
    }

    const purchase = req.body.data.purchase;
    const { id: purchaseId, checkoutId, accountId, items } = purchase;

    if (processedPurchases.has(purchaseId)) {
        console.log(`Purchase already processed: ${purchaseId}`);
        return res.status(200).send("OK");
    }

    const player = players[accountId];

    if (!player) {
        console.error(`Unknown player: ${accountId}`);
        return res.status(400).send("Unknown player");
    }

    const goldItem = items.find((item) => item.sku === "gold-coins-100");

    if (!goldItem) {
        console.error(`Unknown SKU in purchase: ${purchaseId}`);
        return res.status(400).send("Unknown SKU");
    }

    player.goldCoins += 100 * goldItem.quantity;

    processedPurchases.add(purchaseId);
    fulfilledCheckouts.add(checkoutId);

    console.log(
        `Fulfilled purchase ${purchaseId}: ${accountId} now has ${player.goldCoins} Gold Coins`
    );

    res.status(200).send("OK");
});

app.get("/player/:accountId", (req, res) => {
    const player = players[req.params.accountId];

    if (!player) {
        return res.status(404).json({
            error: "Player not found"
        });
    }

    res.json(player);
});

app.get("/purchase-status/:checkoutId", (req, res) => {
    res.json({
        fulfilled: fulfilledCheckouts.has(req.params.checkoutId)
    });
});

app.get("/success", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Purchase Complete</title>
</head>
<body>
    <h1 id="title">Confirming item delivery...</h1>
    <p id="status">Checking that your Gold Coins were added to gamer-kyle.</p>

    <button onclick="window.location.href='/'">Back to webshop</button>

    <script>
        const checkoutId = sessionStorage.getItem("neonCheckoutId");
        const maxAttempts = 15;
        let attempts = 0;

        async function checkStatus() {
            if (!checkoutId) {
                showError("Unable to identify this checkout.");
                return;
            }

            try {
                const response = await fetch(
                    "/purchase-status/" + encodeURIComponent(checkoutId)
                );

                const data = await response.json();

                if (data.fulfilled) {
                    document.getElementById("title").textContent =
                        "Item delivered successfully!";

                    document.getElementById("status").textContent =
                        "100 Gold Coins were added to gamer-kyle.";

                    sessionStorage.removeItem("neonCheckoutId");
                    return;
                }

                attempts++;

                if (attempts >= maxAttempts) {
                    document.getElementById("title").textContent =
                        "Delivery confirmation delayed";

                    document.getElementById("status").textContent =
                        "Your payment was completed, but item delivery has not been confirmed yet.";
                    return;
                }

                setTimeout(checkStatus, 1000);
            } catch (error) {
                console.error("Status check failed:", error);
                showError("Unable to check item delivery status.");
            }
        }

        function showError(message) {
            document.getElementById("title").textContent =
                "Unable to confirm delivery";

            document.getElementById("status").textContent = message;
        }

        checkStatus();
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});