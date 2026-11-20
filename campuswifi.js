
// #!/usr/bin/env node

const { spawnSync } = require("child_process");
const prompts = require("prompts");
const keytar = require("keytar");

// ==========================================
// CONFIGURATION
// ==========================================

const SERVICE = "CampusWiFiCLI";

const CHECK_URL =
    "http://connectivitycheck.gstatic.com/generate_204";

const DEFAULT_PORTAL =
    "https://192.168.100.1:6082/php/uid.php?vsys=1&rule=11";

const SUCCESS_TEXT = "User Authenticated";


// ==========================================
// LOGGING
// ==========================================

const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    success: (msg) => console.log(`[SUCCESS] ${msg}`),
    error: (msg) => console.log(`[ERROR] ${msg}`),
    warn: (msg) => console.log(`[WARNING] ${msg}`)
};


// ==========================================
// CREDENTIAL MANAGEMENT
// ==========================================

async function saveCredentials() {

    const response = await prompts([
        {
            type: "text",
            name: "username",
            message: "Username:"
        },
        {
            type: "password",
            name: "password",
            message: "Password:"
        }
    ]);

    const { username, password } = response;

    if (!username || !password) {
        log.error("Username and password cannot be empty.");
        return;
    }

    try {

        await keytar.setPassword(
            SERVICE,
            username.trim(),
            password
        );

        await keytar.setPassword(
            SERVICE,
            "__username__",
            username.trim()
        );

        log.success("Credentials saved in Windows Credential Manager.");

    } catch (error) {
        log.error(`Credential storage failed: ${error.message}`);
    }
}


async function getCredentials() {

    const username = await keytar.getPassword(
        SERVICE,
        "__username__"
    );

    if (!username) {
        return null;
    }

    const password = await keytar.getPassword(
        SERVICE,
        username
    );

    if (!password) {
        return null;
    }

    return { username, password };
}


// ==========================================
// CURL EXECUTION
// ==========================================

function runCurl(args, input = undefined) {

    const result = spawnSync(
        "curl.exe",
        args,
        {
            encoding: "utf8",
            input,
            windowsHide: true,
            timeout: 30000,
            maxBuffer: 5 * 1024 * 1024
        }
    );

    if (result.error) {
        throw result.error;
    }

    return result;
}


// ==========================================
// CAPTIVE PORTAL DETECTION
// ==========================================

function checkLoginStatus() {

    log.info("Checking internet connectivity...");

    const result = runCurl([
        "-sS",
        "-D", "-",
        "-o", "NUL",
        "--max-time", "10",
        "--max-redirs", "0",
        CHECK_URL
    ]);

    if (result.status !== 0) {
        throw new Error(
            result.stderr || "Connectivity check failed."
        );
    }

    const headers = result.stdout;

    console.log("\n[RESPONSE HEADERS]");
    console.log(headers);

    // Find the last Location header.
    const locations = [
        ...headers.matchAll(/^location:\s*(.+)$/gim)
    ];

    if (locations.length > 0) {

        const redirect = locations[locations.length - 1][1].trim();

        return new URL(redirect, CHECK_URL).href;
    }

    return null;
}


// ==========================================
// PORTAL AUTHENTICATION
// ==========================================

function loginPortal(redirectUrl, username, password) {

    log.info("Preparing authentication request...");

    const formData = new URLSearchParams({
        inputStr: "",
        escapeUser: username,
        preauthid: "",
        user: username,
        passwd: password,
        ok: "Login"
    }).toString();

    log.info("Sending POST request...");

    const result = runCurl([
        "-k",
        "-sS",
        "-i",
        "--max-time", "20",
        "-X", "POST",
        redirectUrl,
        "-H", "Content-Type: application/x-www-form-urlencoded",
        "--data-binary", "@-",
        "-w", "\n__HTTP_STATUS__:%{http_code}\n"
    ], formData);

    if (result.status !== 0) {
        throw new Error(
            result.stderr || "Curl authentication failed."
        );
    }

    const output = result.stdout;

    const statusMatch = output.match(
        /__HTTP_STATUS__:(\d{3})/
    );

    const httpStatus = statusMatch
        ? statusMatch[1]
        : "Unknown";

    const body = statusMatch
        ? output.slice(0, statusMatch.index)
        : output;

    console.log("\n========== SERVER RESPONSE ==========");

    console.log(body);

    console.log("=====================================");

    log.info(`HTTP Status: ${httpStatus}`);

    const bodyLower = body.toLowerCase();

    const failureMessages = [
        "invalid username",
        "invalid password",
        "incorrect password",
        "authentication failed",
        "login failed",
        "wrong password",
        "invalid credentials"
    ];

    if (
        failureMessages.some(message =>
            bodyLower.includes(message)
        )
    ) {
        log.error("Authentication failed. Check your credentials.");
        return;
    }

    if (bodyLower.includes(SUCCESS_TEXT.toLowerCase())) {
        log.success("User Authenticated!");
        log.success("Campus Wi-Fi login completed.");
        return;
    }

    if (["200", "301", "302", "303"].includes(httpStatus)) {

        log.warn("Login request completed.");
        log.warn("Authentication is not explicitly confirmed.");
        log.info("Try opening a website to verify internet access.");

        return;
    }

    log.error(`Unexpected HTTP response: ${httpStatus}`);
}


// ==========================================
// MAIN LOGIN FUNCTION
// ==========================================

async function login() {

    const credentials = await getCredentials();

    if (!credentials) {
        log.error("Credentials not found.");
        console.log("Run: campuswifi set");
        return;
    }

    const { username, password } = credentials;

    console.log("");
    log.info("Starting campus Wi-Fi authentication...");
    log.info(`Username: ${username}`);

    try {

        const redirectUrl = checkLoginStatus();

        if (!redirectUrl) {

            log.success(
                "No captive portal redirect detected."
            );

            log.info(
                "You may already be connected to the internet."
            );

            return;
        }

        console.log("");
        log.info(`Portal URL: ${redirectUrl}`);

        loginPortal(
            redirectUrl,
            username,
            password
        );

    } catch (error) {

        log.error(error.message);

    }
}


// ==========================================
// COMMAND HANDLER
// ==========================================

async function main() {

    const command = process.argv[2];

    switch (command) {

        case "set":
            await saveCredentials();
            break;

        case "remove": {
            const username = await keytar.getPassword(
                SERVICE,
                "__username__"
            );

            if (username) {
                await keytar.deletePassword(
                    SERVICE,
                    username
                );

                await keytar.deletePassword(
                    SERVICE,
                    "__username__"
                );

                log.success("Credentials removed.");
            } else {
                log.warn("No credentials found.");
            }

            break;
        }

        case "help":
        case "--help":
            console.log(`
CampusWiFi CLI

Usage:

  wifi          Authenticate
  wifi set      Save credentials
  wifi remove   Remove credentials
  wifi help     Show help
`);
            break;

        case undefined:
            await login();
            break;

        default:
            log.error(`Unknown command: ${command}`);
            console.log("Run: campuswifi help");
    }
}


// ==========================================
// EXECUTION
// ==========================================

main().catch(error => {
    log.error(error.message);
    process.exitCode = 1;
});
