# Deploying PromptFrame

## Configure generation

The app supports Pollinations for image and video generation. Create an account and a Secret key at [enter.pollinations.ai/keys](https://enter.pollinations.ai/keys), then set `POLLINATIONS_API_KEY` as a **server-side environment variable** in your deployment provider. Pollinations may grant free Pollen through eligible quests; availability and balance vary. Check model pricing and your wallet before use.

For local development, copy `.env.example` to `.env.local` and set your key there. Restart `npm run dev` after changing environment variables. Do not commit `.env.local`, put keys in client code, or name a secret `NEXT_PUBLIC_*`.

The app also supports fal.ai as an alternative provider using `FAL_KEY`. It uses FLUX for images and MiniMax Video 01 for video. fal.ai usage may be billed separately; see its [pricing page](https://fal.ai/pricing).

## Deploy

1. Push the project to a Git provider and import it into a Node.js hosting provider that supports Next.js App Router route handlers.
2. Add `POLLINATIONS_API_KEY` (or `FAL_KEY`) in the hosting provider's encrypted environment-variable settings.
3. Use `npm run build` as the build command and `npm run start` as the start command (or the provider's Next.js preset).
4. Redeploy after adding the key, then generate an image and a short video to verify the account's model access and usage balance.

Pollinations media is saved under `public/generated` on the server. fal.ai media is returned from the provider's hosted media URL. For serverless deployments, configure persistent storage if using Pollinations, or use fal.ai's hosted media URL path.
