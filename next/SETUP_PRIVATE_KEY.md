# Setting Up Your APP_PRIVATE_KEY

To use the sub-account creation API endpoint, you need to set up a private key for your app. This key will be used to sign transactions that create sub-accounts for your users.

## Development Environment Setup

1. Generate a new private key (don't use this one in production):

   ```bash
   node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Create a `.env.local` file in the root of your Next.js project:

   ```
   # App private key for sub-account creation
   APP_PRIVATE_KEY=0x<your-generated-private-key>

   # Other environment variables (if needed)
   NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   NEXT_PUBLIC_ALCHEMY_AMOY_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
   NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your-thirdweb-client-id
   ```

3. Fund the wallet associated with this private key with some Base Sepolia ETH:
   - Get the address: `node -e "console.log(require('viem').privateKeyToAccount('0x<your-private-key>').address)"`
   - Use a Base Sepolia faucet to send it some ETH

## Production Environment (Vercel)

For production deployments on Vercel:

1. Go to your project settings in the Vercel dashboard
2. Navigate to the "Environment Variables" section
3. Add your `APP_PRIVATE_KEY` as an environment variable
4. Make sure to check "Production" and any other environments where you want to use this key

**IMPORTANT SECURITY NOTES:**

- Never commit your private key to Git
- Never expose your private key on the client side
- Use a separate private key for your production environment
- Regularly rotate your private key for better security
- Monitor the account for any suspicious activities

## Testing Your Setup

After setting up your private key, you can test the sub-account creation by:

1. Starting your development server: `npm run dev`
2. Connecting your wallet to the app
3. Clicking the "Create Sub-Account" button in the app
4. Checking your browser console for transaction logs

The API endpoint will use your private key to sign and send transactions that create sub-accounts for your users.
