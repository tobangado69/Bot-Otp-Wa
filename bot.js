const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { getLatestOtp } = require("./gmail");
const moment = require("moment-timezone");

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Scan QR untuk login ke WhatsApp");
});

client.on("ready", () => {
  console.log("Bot WhatsApp udah nyala nih bosku!");
});

client.on("message", async (message) => {
  const body = message.body.trim();
  if (body.toLowerCase().startsWith("!otp ")) {
    const username = body.slice(5).trim();

    const otpData = await getLatestOtp(username);
    if (!otpData) {
      message.reply(
        `❌ Belum ada OTP untuk username: *${username}*\n\nSilahkan dicoba kembali dalam 2 menit 🙏`
      );
    } else {
      const { otp, timestamp } = otpData;
      const now = moment(timestamp)
        .tz("Asia/Jakarta")

        .format("YYYY-MM-DD HH:mm:ss");

      message.reply(
        `🛡 Kode Steam Guard untuk username *${username}* : *${otp}*\n\n🖥 Indonesia (Indonesia)\n⌚ ${now} WIB\n\n⚠⚠ Perhatian ⚠⚠\nJika OTP tidak bisa, silahkan login ulang dan request lagi dalam waktu 3 menit`
      );
    }
  }
});

client.initialize();
