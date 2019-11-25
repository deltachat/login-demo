# Login with DeltaChat - Demo

Using DeltaChat as an authentication provider. This generates a QR code which
you can scan with Delta Chat to create an account and get a login cookie.

## Setup

node.js version 10 or higher required.


1. Generate a configuration by putting JSON-encoded data into `$HOME/.login-dcrc`. E.g.:

```json
{
    "email_address": "loginbot@example.org",
    "email_password": "verysecure"
}
```

2. Install the dependencies with `npm i` and run it with `npm start`.

