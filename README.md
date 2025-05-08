# Imperfect Form

A web app for on-chain fitness challenges with real-time pose detection, leaderboards, and social sharing.

---

## 🚀 Project Structure

This repository contains two implementations of the Imperfect Form application:

1. **Next.js Implementation** (current development focus)
2. **Vanilla JS Implementation** (legacy version)

### Next.js Implementation

The Next.js implementation is located in the `next/` directory and represents the modern, scalable version of the application with improved architecture and features.

### Vanilla JS Implementation

The original implementation using vanilla JavaScript is preserved in the `vanillaJS/` directory for reference and backward compatibility.

---

## Project Structure

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
├── vanillaJS/               # Original vanilla JS implementation
│   ├── package.json
│   ├── webpack.config.js
│   ├── server.js
│   ├── socketServer.js
│   ├── assets/              # Static assets for vanilla JS version
│   └── src/                 # Source code for vanilla JS version
├── backend/                 # Backend services (used by both implementations)
│   ├── server.js
│   ├── socketServer.js
│   └── utils/
└── .env                     # Environment variables
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

## Getting Started

### Prerequisites

- Node.js >= 20.x (for Next.js implementation)
- Node.js >= 18.x (for vanilla JS implementation)
- Yarn or npm

### Next.js Implementation

```bash
# Navigate to the Next.js directory
cd next

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Vanilla JS Implementation

```bash
# Navigate to the vanilla JS directory
cd vanillaJS

# Install dependencies
npm install

# Run the development server
npm run start

# In a separate terminal, run the backend server
npm run server

# In another terminal, run the socket server (if needed)
npm run socket-server
```

### Configuration

- Copy `.env.example` to `.env` and fill in the required API keys and environment variables

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
