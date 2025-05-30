const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = "token.json";

function authorize(callback) {
  const credentials = require("./credentials.json");
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

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
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this URL:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log("Token stored to", TOKEN_PATH);
      callback(oAuth2Client);
    });
  });
}

// Fungsi rekursif untuk ekstrak isi dari payload
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

      // ambil otp terbaru selama 10 menit terakhir
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
      let bodyData = extractBody(payload) || payload.body?.data;

      if (!bodyData) {
        console.error("❌ Tidak ada data body ditemukan dalam email.");
        console.log(JSON.stringify(payload, null, 2));
        return resolve(null);
      }

      const html = Buffer.from(bodyData, "base64").toString("utf-8");

      // Filter region Indonesia
      if (!html.includes("Indonesia")) {
        console.log("⚠️ Email bukan dari region Indonesia, abaikan.");
        return resolve(null);
      }

      const match = html.match(/\b[A-Z0-9]{5}\b/);

      if (match) {
        const otp = match[0];
        const timestamp = Number(msg.data.internalDate); // timestamp email dalam milidetik
        console.log("✅ OTP ditemukan:", otp, "Timestamp:", timestamp);
        resolve({ otp, timestamp });
      } else {
        console.log("⚠️ Tidak ditemukan OTP dalam email.");
        console.log(html);
        resolve(null);
      }
    });
  });
}

module.exports = { getLatestOtp };
