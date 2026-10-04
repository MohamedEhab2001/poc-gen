# EmailJS outreach template setup

This guide creates the EmailJS template the `emailjs` provider sends
through. The application passes every parameter below; the dashboard side
must be configured once by an operator with access to the EmailJS account.

> This document cannot create anything inside your EmailJS account — the
> steps below are performed by a human in the EmailJS dashboard.

## 1. Create the EmailJS template

1. Sign in to the [EmailJS dashboard](https://dashboard.emailjs.com/).
2. Open **Email Templates** and make sure the email service connected is the
   one whose Service ID is `service_dhodx9y` (the service that connects
   EmailJS to your sending mailbox).
3. Create a new template (or edit the existing one whose Template ID the
   deployment uses, for example `template_htm9i2b`).
4. Copy the full contents of
   [`docs/emailjs-outreach-template.html`](./emailjs-outreach-template.html)
   into the template **Content** (HTML editor).
5. In the template **Settings**, set the delivery fields exactly like this:

   | Setting | Value |
   |---|---|
   | To Email | `{{to_email}}` |
   | To Name | `{{business_name}}` |
   | From Name | `{{sender_name}}` |
   | Reply-To | `{{reply_to}}` |
   | Subject | `{{subject}}` |

6. Save. Note the **Template ID** shown at the top (for example
   `template_htm9i2b`) — it becomes `EMAILJS_TEMPLATE_ID`.

A plain-text reference rendering (what `{{body_text}}` carries) is in
[`docs/emailjs-outreach-template.txt`](./emailjs-outreach-template.txt);
EmailJS sends the HTML template, and the plain-text body travels inside it
for copy/paste fidelity.

## 2. Where to obtain the keys

- **Template ID** — top of the template editor page (`template_…`).
- **Public Key** — **Account → General** (the account-wide public key).
- **Private Key** — **Account → Security**. Private keys are shown once when
  generated; store it in your secrets manager immediately.
- While on **Account → Security**, enable **"Allow API requests from
  non-browser applications"** — the Node SDK is a server application and
  calls are rejected without this.

## 3. Environment variables

```env
OUTREACH_SEND_ENABLED=true          # master switch for live sending
OUTREACH_EMAIL_PROVIDER=emailjs     # mock fails closed in production
EMAILJS_SERVICE_ID=service_dhodx9y
EMAILJS_TEMPLATE_ID=template_xxxxxxx
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
EMAILJS_REQUEST_TIMEOUT_MS=10000
EMAILJS_DRY_RUN=true
# plus the compliance identity set:
OUTREACH_SENDER_NAME=…
OUTREACH_FROM_EMAIL=…
OUTREACH_REPLY_TO=…
OUTREACH_POSTAL_ADDRESS=…
```

Rules enforced by the application:

- `EMAILJS_PRIVATE_KEY` is **required in production** when live sending is
  enabled; incomplete EmailJS configuration fails closed.
- `OUTREACH_SEND_ENABLED=true` with provider `mock` fails closed in
  production.
- `EMAILJS_DRY_RUN` defaults to **true** outside production; with it true
  the provider never contacts EmailJS at all (deterministic local outcome).
- The provider adds a cross-instance, PostgreSQL-backed throttle of at least
  1,100 ms between EmailJS calls (see §7).

## 4. Verify configuration without sending

1. Keep `EMAILJS_DRY_RUN=true`.
2. Run the full smoke flow — it exercises prepare/send through the provider
   selection without any network call:
   ```bash
   npm run automation:smoke -- --database="$TEST_DATABASE_URL"
   ```
3. Optionally boot the app and call the `health` tool: it reports
   `sendingEnabled` without exposing configuration values.

## 5. Send one explicitly authorized test email

The project ships a one-off command for exactly this (it reuses the
production EmailJS provider, including the rate throttle, and sends exactly
one message):

```bash
npm run automation:test-email -- --to=you@yourdomain.com --confirm-live-send
```

Preconditions the command enforces itself:

- `--to=` must be an address **you control**;
- `--confirm-live-send` is required;
- `EMAILJS_DRY_RUN=false` must be set explicitly (it refuses otherwise);
- the full `EMAILJS_*` configuration must be present;
- a local `DATABASE_URL` (or `TEST_DATABASE_URL`) is used only for the
  provider's rate-throttle slot.

The message contains non-functional test links, the compliance footer, and
the unsubscribe link, and the command never prints the recipient or any
secret. Check the received email (subject, CTA, footer, unsubscribe), then
immediately re-disable sending (next section).

## 6. Keep live sending disabled afterwards

Set `OUTREACH_SEND_ENABLED=false` (and `EMAILJS_DRY_RUN=true` for good
measure) the moment the test succeeds. The scheduler's daily task then stops
after `prepare_outreach` until you deliberately re-enable sending.

## 7. EmailJS limitations (read before scaling)

- **Rate limit:** approximately one request per second. The application
  enforces ≥1,100 ms between EmailJS calls with a PostgreSQL-backed
  reservation (works across server instances; bounded wait; a backlog fails
  retryably instead of queueing unbounded). Do not raise sending limits
  assuming EmailJS allows bursts.
- **Template size limits:** EmailJS caps template/payload sizes (roughly
  tens of KB). Outreach bodies are bounded by the schema (8 KB), which
  stays safely inside the limit.
- **Headers:** EmailJS does not support setting custom `Message-ID` or
  `List-Unsubscribe` headers. That is why the **visible unsubscribe link in
  the body is mandatory** — the application always renders it in the
  footer, and one-click (RFC 8058) header support is unavailable on this
  provider.
- **Untrusted HTML:** the template uses EmailJS's unescaped `{{{body_html}}}`
  variable. The application renders that HTML server-side from escaped text
  AND passes it through an allowlist sanitizer (`sanitize-html`: only
  `p br a strong em b i span div`, `http/https/mailto` links, everything
  else — scripts, styles, handlers, iframes, forms, images — stripped).
  Never put other unescaped variables into the template.
- **Inbound replies are NOT automated by this.** EmailJS sends outbound
  email only. Replies still arrive in your mailbox and must be classified
  by the external scheduler (which then calls `record_reply_outcome`).
  A future inbound connector/webhook is required before the system can be
  called fully unattended end-to-end.
