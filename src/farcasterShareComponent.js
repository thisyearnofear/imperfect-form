import useLocalStorage from "../hooks/useLocalStorage";

class FarcasterShareComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      theme: options.theme || "dark",
      shareEndpoint: options.shareEndpoint || "/api/share-farcaster",
    };
    this.isSharing = false;
    this.result = null;

    // Use the useLocalStorage hook
    const [user, setUser, removeUser] = useLocalStorage("user", null);

    this.user = user;
    this.setUser = setUser;
    this.removeUser = removeUser;

    this.init();
  }

  init() {
    this.createDOMElements();
    this.addEventListeners();
  }

  createDOMElements() {
    this.actionButton = document.createElement("button");
    this.actionButton.textContent = "Perform Action";
    this.container.appendChild(this.actionButton);

    this.resultContainer = document.createElement("div");
    this.resultContainer.style.display = "none";
    this.container.appendChild(this.resultContainer);

    this.resultText = document.createElement("p");
    this.resultContainer.appendChild(this.resultText);

    this.shareButton = document.createElement("button");
    this.shareButton.textContent = "Share on Farcaster";
    this.resultContainer.appendChild(this.shareButton);
  }

  addEventListeners() {
    this.actionButton.addEventListener("click", () => this.performAction());
    this.shareButton.addEventListener("click", () => this.shareCast());
    window.addEventListener("message", (event) => this.handleMessage(event));
  }

  performAction() {
    this.result = "Awesome result!";
    this.resultText.textContent = `Result: ${this.result}`;
    this.resultContainer.style.display = "block";
  }

  async shareCast() {
    if (this.isSharing) return;
    this.isSharing = true;
    this.shareButton.textContent = "Sharing...";
    this.shareButton.disabled = true;

    const width = 600;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    const popup = window.open(
      "",
      "ShareCast",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (popup) {
      // We'll get the client ID from the server
      const response = await fetch("/api/get-neynar-client-id");
      const { clientId } = await response.json();

      popup.document.write(`
        <html>
          <body>
            <div id="neynar-signin"></div>
            <script src="https://neynarxyz.github.io/siwn/raw/1.2.0/index.js"></script>
            <script>
              function onSignInSuccess(data) {
                window.opener.postMessage({ type: 'FARCASTER_SHARE', data: data }, '*');
                window.close();
              }
              
              new NeynarSignin({
                clientId: '${clientId}',
                onSuccess: onSignInSuccess,
                theme: '${this.options.theme}'
              });
            <\/script>
          </body>
        </html>
      `);
      popup.document.close();
    } else {
      console.error("Unable to open popup window");
      this.resetShareButton();
    }
  }

  async handleMessage(event) {
    if (event.data.type === "FARCASTER_SHARE") {
      const { signer_uuid, fid } = event.data.data;

      // Store user credentials in local storage
      this.setUser({ signer_uuid, fid });

      try {
        const response = await fetch(this.options.shareEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signer_uuid: signer_uuid,
            text: `Check out my result: ${this.result}`,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to share cast");
        }
        console.log("Cast shared successfully!");
        // You might want to show a success message to the user here
      } catch (error) {
        console.error("Error sharing cast:", error);
        // You might want to show an error message to the user here
      } finally {
        this.resetShareButton();
      }
    }
  }

  resetShareButton() {
    this.isSharing = false;
    this.shareButton.textContent = "Share on Farcaster";
    this.shareButton.disabled = false;
  }
}

const ws = new WebSocket("ws://localhost:3000");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.success) {
    console.log("Operation successful:", data.message || data.result);
  } else {
    console.error("Operation failed:", data.error);
    // Handle the error appropriately (e.g., show an error message to the user)
  }
};

// When confirming the cast
document.getElementById("confirmCastButton").addEventListener("click", () => {
  console.log("Confirm and Send button clicked");
  ws.send(
    JSON.stringify({
      type: "confirm-cast",
      payload: {
        signer_uuid: signerUuid,
        text: "I just pumped 0 pushups in 00:00 #OnchainOlympics #ImperfectForm",
      },
    })
  );
  console.log("Confirm-cast message sent");
});

// Usage
document.addEventListener("DOMContentLoaded", () => {
  new FarcasterShareComponent("farcaster-container", {
    theme: "dark",
    shareEndpoint: "/api/share-farcaster",
  });
});
