# Supabase database CA

`supabase-root-2021.crt` is a public CA certificate, not a credential or private
key. It was obtained over HTTPS from Supabase's certificate download:

https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

The database wrapper uses it only for its Supabase connection, with certificate
and hostname verification enabled. It does not install a system-wide trust root.
See https://supabase.com/docs/guides/platform/ssl-enforcement for the provider's
verified TLS connection guidance.
