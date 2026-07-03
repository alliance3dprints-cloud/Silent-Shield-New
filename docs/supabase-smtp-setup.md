# Supabase Auth email delivery via Resend (custom SMTP)

By default Supabase sends auth emails (magic links) through its own service,
which is **heavily rate-limited** (a few per hour) and sent from a generic
address. At launch with thousands of owners, that limit will drop sign-in
emails. Pointing Supabase at Resend's SMTP fixes both branding and the limit.

## One-time setup

1. In **Resend → Settings → SMTP**, get the SMTP credentials:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (TLS)
   - Username: `resend`
   - Password: a Resend **API key** (create one if needed)

2. In **Supabase → Authentication → Settings → SMTP Settings**:
   - Enable **Custom SMTP**
   - Sender email: your verified Resend domain address (e.g. `noreply@alliance3dprints.com`)
   - Sender name: `Silent Shield`
   - Host / Port / Username / Password: from step 1

3. Prerequisite: the sender domain must be **verified in Resend** (SPF/DKIM/DMARC).
   This is the same domain verification needed for scan-alert emails.

## Then customize the template

Supabase → **Authentication → Email Templates → Magic Link**
- Subject: `Your Silent Shield sign-in link`
- Body: paste `docs/supabase-magic-link-email.html`

The template lives in Supabase; Resend only delivers it.
