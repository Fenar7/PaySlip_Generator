# Common Issues & Solutions

## Build & Performance

### Pages loading slowly
- Check your network connection
- Clear browser cache (Ctrl+Shift+R)
- Try a different browser to rule out extensions

### PDF generation timeout
- Large documents (50+ pages) may take longer
- Ensure images are optimized (< 2MB each)
- Try generating during off-peak hours

## Authentication

### Can't log in
- Verify your email address is confirmed
- Check for caps lock on password
- Try "Forgot Password" to reset
- If your org uses SSO, use the "Sign in with SSO" option

### 2FA not working
- Ensure your authenticator app time is synced
- Use backup codes if your device is lost
- Contact your org admin for 2FA reset

### SSO redirect loop
- Clear all browser cookies for slipwise.com
- Ask your IT admin to verify the SAML/OIDC configuration
- Check that the ACS URL matches in your IdP settings

## Data & Documents

### Invoice numbers are skipping
- This is expected if drafts were deleted
- Document numbers are never reused for audit compliance

### Can't delete a paid invoice
- Paid invoices cannot be deleted (audit trail requirement)
- Use "Credit Note" to reverse a paid invoice instead

### Template changes not reflecting
- Installed marketplace templates are snapshots
- Re-install the template to get updates from the publisher

## API & Integrations

### Getting 429 Too Many Requests
- You've hit your tier's rate limit
- Implement exponential backoff in your client
- Consider upgrading to a higher tier for more capacity

### Webhook not receiving events
- Verify your endpoint URL is HTTPS and publicly accessible
- Check the webhook delivery logs in Settings → Developer
- Ensure your server responds with 2xx within 10 seconds

## Billing

### Subscription shows "Past Due"
- A payment attempt failed
- Update your payment method in Settings → Billing
- Click "Retry Payment" to resolve immediately
