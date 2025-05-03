# Imperfect Form

A web app for on-chain fitness challenges with real-time pose detection, leaderboards, and social sharing.

---

## 🚀 Migration Plan: Next.js + thirdweb Wallet

We are migrating the project to [Next.js](https://nextjs.org/) for a modern, scalable, and performant architecture, and integrating [thirdweb](https://thirdweb.com/) for seamless wallet support and web3 SDK features.

---

## New Project Structure (Post-Migration)

```
imperfect-form/
├── README.md
├── package.json
├── next.config.js
├── public/                  # Static assets (images, icons, etc.)
├── src/
│   ├── pages/               # Next.js pages (routes)
│   │   ├── _app.tsx         # App entry (global providers)
│   │   ├── index.tsx        # Home page
│   │   └── ...
│   ├── components/          # Reusable UI components (Leaderboard, Webcam, etc.)
│   ├── modules/             # Business logic, hooks, pose detection, services
│   ├── utils/               # Utility/helper functions
│   ├── constants/           # Config, contract addresses/ABIs
│   ├── styles/              # CSS/SCSS modules
│   └── thirdweb/            # thirdweb config, wallet setup, SDK helpers
├── backend/                 # (Optional) Express/Socket backend if needed
│   ├── server.js
│   ├── socketServer.js
│   ├── signerManager.js
│   ├── config.js
│   └── utils/
└── .env
```

---

## Migration Steps

1. **Create a new Next.js app** (TypeScript recommended)
2. **Move and refactor UI logic** into React components in `src/components/`
3. **Implement pages** in `src/pages/` (e.g., Home, Leaderboard)
4. **Integrate thirdweb**: Add wallet provider, ConnectButton, and SDK logic in `src/thirdweb/`
5. **Move business logic** (pose detection, leaderboard, etc.) into `src/modules/`
6. **Move static assets** to `public/`
7. **Migrate backend** (if needed) to `backend/` or use Next.js API routes
8. **Update styles** to use CSS modules or styled-components
9. **Test and optimize** for performance and scalability
10. **Update deployment configs** (Vercel, etc.)

---

## Getting Started (Next.js)

### Prerequisites
- Node.js >= 18.x
- Yarn or npm

### Installation
```bash
yarn install
# or
npm install
```

### Running the App
```bash
yarn dev
# or
npm run dev
```

### Configuration
- Copy `.env.example` to `.env` and fill in the required API keys and environment variables (thirdweb, etc.)

---

## Features
- Real-time pose detection for fitness challenges
- On-chain leaderboard integration
- Social sharing (Farcaster, Twitter)
- thirdweb wallet and SDK integration
- REST and WebSocket APIs (optional backend)

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
