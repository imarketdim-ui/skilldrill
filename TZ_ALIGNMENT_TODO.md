# TZ Alignment TODO

## Deferred Until Supabase / Hosting Migration

### OAuth

- Add frontend env `VITE_VK_AUTH_URL`.
- Enable and configure `Google` and `VK ID` providers.
- Add allowed redirect URLs for `/auth/callback`.
- Return visible `Google` / `VK ID` buttons to the auth screen.

### Phone Verification

- Enable Supabase phone auth and connect an SMS provider.
- Return visible OTP confirmation flow in client settings.
- Re-run full end-to-end verification after provider setup.

### Telegram Webhook

- Register `telegram-webhook` in Telegram Bot API with `setWebhook`.
- Re-check full bot binding flow against the published app after webhook setup.

### KYC

- Replace the current placeholder with a real KYC process.
- Add the moderation / approval contour and final status handling.

## Notes

- `downgrade logic` is done.
- `footer/legal` is done.
- `CRM/ERP alignment` is done.
- `platform/support/integrator` is done.
- `Telegram test/send flow` is done.
- `master/business schedule base unification` is done.
- calendar/journal polish against competitors is done at the current product stage; future work here is optional refinement, not a blocking gap.
