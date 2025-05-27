This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Farcaster Mini App Notifications

This app includes a notification system for Farcaster Mini App users. Use this for special events and announcements only.

### Sending Broadcast Notifications

#### Via API (Recommended)

```bash
curl -X POST https://imperfectform.fun/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom",
    "data": {
      "broadcast": true,
      "notificationId": "unique-id-here",
      "title": "🚀 Your Title Here",
      "body": "Your message here",
      "targetUrl": "https://imperfectform.fun"
    }
  }'
```

#### Example Use Cases

**New Feature Launch:**

```bash
curl -X POST https://imperfectform.fun/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom",
    "data": {
      "broadcast": true,
      "notificationId": "feature-launch-monad",
      "title": "🌟 Monad Network Live!",
      "body": "Start earning rewards on Monad testnet",
      "targetUrl": "https://imperfectform.fun?network=monad"
    }
  }'
```

**Special Challenge:**

```bash
curl -X POST https://imperfectform.fun/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom",
    "data": {
      "broadcast": true,
      "notificationId": "weekend-challenge-jan-2025",
      "title": "🔥 Weekend Challenge!",
      "body": "Double rewards this weekend - Get moving!",
      "targetUrl": "https://imperfectform.fun?challenge=weekend"
    }
  }'
```

### Check Notification Stats

```bash
curl https://imperfectform.fun/api/notifications/send
```

### Best Practices

- Use unique `notificationId` to prevent duplicates
- Keep titles under 32 characters (Farcaster limit)
- Don't send too frequently (max once per week)
- Use for major updates, new features, or special events only
