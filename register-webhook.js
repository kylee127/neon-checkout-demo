async function registerWebhook() {
    try {
        const response = await fetch(
            "https://api.neonpay.com/purchases/webhooks",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-API-KEY": process.env.NEON_API_KEY
                },
                body: JSON.stringify({
                    url: process.env.NEON_WEBHOOK_URL,
                    secret: process.env.NEON_WEBHOOK_SECRET,
                    enabledEvents: ["purchase.completed"],
                    eventVersion: 2
                })
            }
        );

        if (!response.ok) {
            console.error(
                `Webhook registration failed with status ${response.status}`
            );
            return;
        }

        console.log("Webhook registered successfully.");
        console.log(`Webhook URL: ${process.env.NEON_WEBHOOK_URL}`);
    } catch (error) {
        console.error("Webhook registration failed:", error.message);
    }
}

registerWebhook();