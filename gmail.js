const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
require("dotenv").config();

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = "token.json";

function authorize(callback) {
  const client_id = process.env.CLIENT_ID;
  const client_secret = process.env.CLIENT_SECRET;
  const redirect_uris = [process.env.REDIRECT_URI];

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Simpan token baru otomatis jika diperbarui
  oAuth2Client.on("tokens", (tokens) => {
    const current = fs.existsSync(TOKEN_PATH)
      ? JSON.parse(fs.readFileSync(TOKEN_PATH))
      : {};
    const updated = {
      ...current,
      ...tokens,
    };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
  });

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  } else {
    getNewToken(oAuth2Client, callback);
  }
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // agar dapat refresh_token
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this URL:\n", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("❌ Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
      console.log("✅ Token stored to", TOKEN_PATH);
      callback(oAuth2Client);
    });
  });
}

// Fungsi rekursif untuk mengekstrak isi email
function extractBody(payload) {
  if (!payload) return null;

  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result) return result;
    }
  }

  if (payload.mimeType === "text/html" || payload.mimeType === "text/plain") {
    return payload.body?.data || null;
  }

  return null;
}

async function getLatestOtp(username) {
  return new Promise((resolve) => {
    authorize(async (auth) => {
      const gmail = google.gmail({ version: "v1", auth });

      const now = Date.now();
      const tenMinutesAgoInSeconds = Math.floor((now - 10 * 60 * 1000) / 1000);

      // Query untuk mencari email OTP dari Steam, EA, dan Epic Games
      const queries = [
        `from:noreply@steampowered.com subject:"Your Steam account: Access from new computer" after:${tenMinutesAgoInSeconds}`,
        `from:ea@e.ea.com subject:"Your EA Security Code" after:${tenMinutesAgoInSeconds}`,
        `from:noreply@epicgames.com subject:"Your Security Code" after:${tenMinutesAgoInSeconds}`,
      ];

      for (const query of queries) {
        const res = await gmail.users.messages.list({
          userId: "me",
          maxResults: 5,
          q: query,
        });

        const messages = res.data.messages;
        if (!messages) continue;

        for (const msgMeta of messages) {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: msgMeta.id,
          });

          const payload = msg.data.payload;
          const internalDate = Number(msg.data.internalDate);
          let bodyData = extractBody(payload) || payload.body?.data;
          if (!bodyData) continue;

          const html = Buffer.from(bodyData, "base64").toString("utf-8");

          // Optional: cek region Indonesia
          if (!html.toLowerCase().includes("indonesia")) continue;

          // Cek username (Steam)
          if (username && !html.toLowerCase().includes(username.toLowerCase())) continue;

          // Regex EA/Epic (6 angka) atau Steam (5 huruf/angka)
          const matchNumeric = html.match(/\b\d{6}\b/); // EA/Epic
          const matchSteam = html.match(/\b[A-Z0-9]{5}\b/); // Steam

          const otp = matchNumeric ? matchNumeric[0] : matchSteam ? matchSteam[0] : null;
          if (!otp) continue;

          return resolve({ otp, timestamp: internalDate });
        }
      }

      console.log("❌ Tidak ditemukan OTP di semua query.");
      resolve(null);
    });
  });
}


module.exports = { getLatestOtp };
