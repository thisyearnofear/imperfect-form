# Imperfect Form

A web app for on-chain fitness challenges with real-time pose detection, leaderboards, and social sharing.

---

## 🚀 Project Structure

This repository contains two implementations of the Imperfect Form application:

1. **Next.js Implementation** (active production version)
2. **Vanilla JS Implementation** (legacy reference only - not for production use)

### Next.js Implementation

The Next.js implementation is located in the `next/` directory and represents the modern, scalable version of the application with improved architecture and features. This is the only version that should be used for production and active development.

### Vanilla JS Implementation

The original implementation using vanilla JavaScript is preserved in the root and `vanillaJS/` directories for reference purposes only. This code is not actively maintained and should not be built or deployed.

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

### TypeScript and ESLint Configuration

The Next.js implementation uses TypeScript and ESLint for code quality and type safety. When building the project, you may encounter TypeScript or ESLint errors that need to be fixed before the build can complete.

Common issues and solutions:

1. **React Hooks Rules**: Ensure hooks are called at the top level of components and not inside conditionals. Use wrapper components when needed to isolate hook usage.

2. **Window Interface Extensions**: When extending the global `Window` interface, be careful about conflicts with existing definitions. Check `src/types/window.d.ts` for current definitions.

3. **Wallet Provider Configuration**: The wallet connectors (ThirdWeb, Coinbase Wallet) have specific configuration requirements. Some properties like `checkCrossOriginOpenerPolicy` may not be supported in newer versions.

4. **Conditional Hook Calls**: If you need to use hooks conditionally, create separate components that use the hooks unconditionally and conditionally render those components instead.

5. **Dependency Arrays**: Always include all dependencies in useEffect and useCallback dependency arrays to prevent stale closures and unnecessary re-renders.

### Legacy Vanilla JS Implementation (Reference Only)

The vanilla JS implementation is kept for reference purposes only and should not be used for production. The code in the root and `vanillaJS/` directories is not actively maintained.

### Configuration

- Copy `.env.example` to `.env` and fill in the required API keys and environment variables

---

## Features

- Real-time pose detection for fitness challenges
- On-chain leaderboard integration
- Social sharing (Farcaster, Twitter)
- thirdweb wallet and SDK integration
- REST and WebSocket APIs (optional backend)
- Coinbase Smart Wallet integration with spend limits and sub-accounts

### Wallet Integration

The application supports two main wallet integration approaches:

1. **ThirdWeb Signature Wallet** (for Polygon network)

   - Traditional EOA wallet integration
   - Used for Polygon Mainnet

2. **Coinbase Smart Wallet** (for Base network)
   - Account abstraction wallet with advanced features
   - Used for Base Sepolia testnet
   - Supports spend limits and sub-accounts

### Coinbase Smart Wallet Features

#### Spend Limits

The application implements Coinbase Smart Wallet's spend limits feature, which allows users to:

1. Set up a spending allowance for the application
2. Submit transactions without signing each time (gasless experience)
3. Manage and revoke permissions

Implementation details:

- Located in `next/src/components/wallet/SetupSpendLimits.tsx`
- Uses the Coinbase Wallet connector from Wagmi
- Requires the `smartWalletOnly` preference in wallet configuration

#### Sub-Accounts

The application also supports Coinbase Smart Wallet's sub-accounts feature, which allows users to:

1. Create and manage multiple accounts under a single wallet
2. Switch between accounts for different purposes
3. View all sub-accounts and their balances

Implementation details:

- Located in `next/src/pages/smart-account-setup.tsx` and related components
- Uses the Coinbase Wallet provider's `getSubAccounts()` method
- Requires proper detection of Coinbase Wallet capabilities

### Known Issues and Troubleshooting

#### Coinbase Smart Wallet Integration

1. **Sub-Account Detection**: The Coinbase Wallet provider's `getSubAccounts()` method may not be consistently available or may return inconsistent results. Check for the existence of this method before calling it.

2. **Spend Limits Setup**: The spend limits feature requires the wallet to be in smart wallet mode. Ensure the `preference` option is set to `smartWalletOnly` in the wallet connector configuration.

3. **Provider Detection**: When multiple wallet providers are installed (e.g., MetaMask and Coinbase Wallet), detection can be tricky. Use the `providers` array to find the Coinbase Wallet provider.

#### Performance Optimization

The application may experience performance issues, especially with the TensorFlow.js and MediaPipe pose detection. Consider these optimization strategies:

1. **Lazy Loading**: Use dynamic imports with Next.js to load heavy components only when needed
2. **Server Components**: Convert appropriate components to React Server Components
3. **Webpack Optimization**: Configure webpack to optimize bundle size
4. **TensorFlow.js Optimization**: Use the WebGL backend and consider model quantization
5. **Caching**: Implement caching for API responses and blockchain data
6. **Build Optimization**: Use production builds with proper minification and tree-shaking

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
