# Imperfect Form

A web app for on-chain fitness challenges with real-time pose detection, leaderboards, and social sharing. Live on CELO, BASE, POLYGON and MONAD testnet.

---

## 🚀 Project Structure

This repository contains the production **Next.js** implementation of Imperfect Form. All development and deployment is based on this version.

```
imperfect-form/
├── README.md
├── next/                    # Next.js implementation (current development)
│   ├── package.json
│   ├── next.config.js
│   ├── public/              # Static assets (images, icons, etc.)
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   ├── components/      # Reusable UI components (Leaderboard, Webcam, etc.)
│   │   ├── modules/         # Business logic, hooks, pose detection, services
│   │   ├── utils/           # Utility/helper functions
│   │   ├── constants/       # Config, contract addresses/ABIs
│   │   ├── styles/          # CSS/SCSS modules
│   │   └── types/           # TypeScript type definitions
│   └── contracts/           # Smart contract files
├── backend/                 # Backend services (optional)
│   ├── server.js
│   ├── socketServer.js
│   └── utils/
└── .env                     # Environment variables
```

---

## Getting Started

### Prerequisites

- Node.js >= 20.x
- Yarn or npm

### Next.js Implementation (Production Version)

```bash
# Navigate to the Next.js directory
cd next

# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build
```

---

## Features

- Real-time pose detection for fitness challenges
- On-chain leaderboard integration
- **🎭 Farcaster Mini App integration** (LIVE!)
- Social sharing (Farcaster, Twitter)
- thirdweb wallet and SDK integration
- REST and WebSocket APIs (optional backend)
- Coinbase Smart Wallet integration with spend limits and sub-accounts

### 🎭 Farcaster Mini App Integration

Imperfect Form is a fully-featured **Farcaster Mini App**—live and deployed. It works seamlessly as both a standalone web application and within the Farcaster ecosystem.

#### Mini App Highlights

- **Dual Platform**: Web app and Farcaster Mini App
- **Automatic Detection**: UI adapts when accessed via Farcaster
- **Seamless Wallet Integration**: Auto-connects to Farcaster wallet in Mini App context
- **Native Sharing**: Share achievements to Farcaster feed
- **User Context**: Displays Farcaster user profile and social info
- **Add to Apps**: Quick access from Farcaster client
- **Notifications Ready**: Workout reminders and achievements

#### Technical Details

- Uses @farcaster/frame-sdk v0.0.51 and official Mini App spec
- Manifest at `/.well-known/farcaster.json`
- Webhook system for Mini App events
- Mini App-aware UI components
- Account association and cryptographic verification complete

#### How to Test Mini App Features

1. **Share URL**: Post `https://imperfectform.fun` in a Farcaster cast
2. **Access via Farcaster**: Open the cast in Warpcast mobile app
3. **Look for Mini App Features**: Mini App banner, user profile, sharing, "Add to Apps", and automatic wallet connection

---

## Wallet Integration

- **ThirdWeb Signature Wallet** (Polygon)
- **Coinbase Wallet** (Base)

---

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

---

## License

MIT

---

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [thirdweb](https://thirdweb.com/)
- [MediaPipe](https://mediapipe.dev/)
- [Socket.io](https://socket.io/)
- [Express](https://expressjs.com/)
- [Farcaster](https://www.farcaster.xyz/)
