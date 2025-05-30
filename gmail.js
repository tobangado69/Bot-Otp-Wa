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

async function getLatestOtp() {
  return new Promise((resolve) => {
    authorize(async (auth) => {
      const gmail = google.gmail({ version: "v1", auth });

      // OTP terbaru dari 10 menit terakhir
      const tenMinutesAgoInSeconds = Math.floor(
        (Date.now() - 10 * 60 * 1000) / 1000
      );

      const res = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10,
        q: `from:noreply@steampowered.com subject:"Your Steam account: Access from new computer" after:${tenMinutesAgoInSeconds}`,
      });

      const messages = res.data.messages;
      if (!messages || messages.length === 0) {
        console.error("❌ Tidak ada email ditemukan.");
        return resolve(null);
      }

      const msg = await gmail.users.messages.get({
        userId: "me",
        id: messages[0].id,
      });

      const payload = msg.data.payload;
      const internalDate = Number(msg.data.internalDate);
      let bodyData = extractBody(payload) || payload.body?.data;

      if (!bodyData) {
        console.error("❌ Tidak ada data body ditemukan dalam email.");
        return resolve(null);
      }

      const html = Buffer.from(bodyData, "base64").toString("utf-8");

      // Filter berdasarkan region Indonesia
      if (!html.toLowerCase().includes("indonesia")) {
        console.log("⚠️ Email bukan dari region Indonesia, abaikan.");
        return resolve(null);
      }

      // Cari OTP dengan regex yang lebih akurat
      const match = html.match(/(?:code|OTP|Guard)[^A-Z0-9]*([A-Z0-9]{5})/i);
      const otp = match ? match[1] : null;

      if (otp) {
        console.log("✅ OTP ditemukan:", otp, "Timestamp:", internalDate);
        resolve({ otp, timestamp: internalDate });
      } else {
        console.log("⚠️ Tidak ditemukan OTP dalam email.");
        console.log(html); // Debug opsional
        resolve(null);
      }
    });
  });
}

module.exports = { getLatestOtp };
