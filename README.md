# CampusWiFi CLI

A lightweight Windows command-line utility to authenticate with campus Wi-Fi captive portals directly from the terminal.

No browser automation. No manual login page. Just one command to connect.

## Features

- **One-command authentication:** Log in to campus Wi-Fi using a single terminal command.
- **Automatic portal detection:** Detects captive portal redirects using a connectivity-check request.
- **Secure credential storage:** Stores credentials in Windows Credential Manager.
- **Direct HTTP authentication:** Sends URL-encoded POST requests using Windows `curl.exe`.
- **Terminal logs:** Displays HTTP status, server responses, and authentication results.
- **Lightweight:** Built with Node.js without browser automation.

## Tech Stack

- Node.js
- Windows Credential Manager (`keytar`)
- curl
- Prompts
- Child Process (`spawnSync`)

## Prerequisites

- Windows 10 or Windows 11
- Node.js and npm
- Windows `curl.exe` (available by default on modern Windows versions)
- Access to a supported campus Wi-Fi network

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/CampusWiFi-CLI.git
```

Navigate into the project:

```bash
cd CampusWiFi-CLI
```

Install dependencies:

```bash
npm install
```

Register the command globally:

```bash
npm link
```

## Usage

### 1. Save credentials (first-time setup)

```bash
campuswifi set
```

Enter your campus username and password when prompted.

Credentials are stored in Windows Credential Manager.

### 2. Authenticate

```bash
campuswifi
```

The utility will:

1. Retrieve saved credentials.
2. Check internet connectivity.
3. Detect the captive portal redirect.
4. Send the authentication POST request.
5. Display the server response and login status.

### 3. Remove saved credentials

```bash
campuswifi remove
```

### 4. Display help

```bash
campuswifi help
```

## How It Works

The authentication workflow is:

```text
        Terminal Command
               |
               v
      Retrieve Credentials
               |
               v
    Check Internet Connectivity
               |
               v
      Detect Portal Redirect
               |
               v
       Extract Portal URL
               |
               v
       Prepare Form Data
               |
               v
         Send POST Request
               |
               v
      Inspect Server Response
               |
               v
       Display Authentication
              Status
```

## Authentication Request

The utility sends an HTTP POST request using:

`application/x-www-form-urlencoded`

Form parameters:

| Parameter | Description |
|---|---|
| `inputStr` | Empty field |
| `escapeUser` | Campus username |
| `preauthid` | Empty field |
| `user` | Campus username |
| `passwd` | Campus password |
| `ok` | Login action |

The actual portal URL is discovered dynamically through the connectivity-check redirect.

## Security

- Credentials are stored using Windows Credential Manager.
- Passwords are not intentionally written to project files.
- Passwords are passed to curl through standard input as part of the request body, not as command-line arguments.
- The portal uses HTTPS certificate verification bypass (`-k`) because some campus portals use certificates that Windows does not trust. Only use this with your known campus portal.

## Limitations

- Currently designed for Windows.
- Portal authentication parameters may vary between institutions.
- The connectivity-check endpoint must return a captive portal redirect for automatic detection.
- An HTTP success response does not necessarily mean authentication succeeded. The utility looks for an explicit authentication message where available.

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a Pull Request.

## License

MIT License. See [LICENSE](LICENSE).

---

**Built to make campus Wi-Fi authentication simpler, faster, and accessible directly from the terminal.**