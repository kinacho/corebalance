# Known Issues

- **Firebase Warning**: When running locally without `.env` credentials, console outputs a warning stating cloud sync is deactivated. (This is expected behavior for local-first operations).
- **Vercel deploy warning**: Pre-rendering is skipped because the app is 100% dynamic SSR, requiring careful workbox glob configurations.
