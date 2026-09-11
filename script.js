const buyButton = document.getElementById("buyButton");

buyButton.addEventListener("click", async () => {
    try {
        const response = await fetch("/create-checkout", {
            method: "POST"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to create checkout");
        }

        if (!data.checkoutId || !data.redirectUrl) {
            throw new Error("Invalid checkout response");
        }

        sessionStorage.setItem("neonCheckoutId", data.checkoutId);
        window.location.href = data.redirectUrl;
    } catch (error) {
        console.error("Checkout creation failed:", error);
        alert("Something went wrong while creating the checkout.");
    }
});