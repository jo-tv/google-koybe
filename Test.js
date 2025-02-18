require("dotenv").config();
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());

// ✅ الاتصال بقاعدة البيانات
mongoose.connect(
  "mongodb+srv://josefuccef7:gHkpeNOLUzOvawuh@cluster0.qmwgw.mongodb.net/alldata?retryWrites=true&w=majority&appName=Cluster0"
).then(() => console.log("✅ متصل بقاعدة البيانات"))
  .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// ✅ تعريف نموذج القنوات مع تخزين `target`
const channelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  target: { type: String, required: true }, // تحديد Target الخاص بالقناة
  url: { type: String, required: true }
});
const Channel = mongoose.model("canal", channelSchema);

// ✅ استخراج `target` و `url` بناءً على اسم القناة
app.use("/:channel", async (req, res, next) => {
  const channelName = req.params.channel;
  console.log(`🔍 البحث عن القناة: ${channelName}`);

  try {
    const channel = await Channel.findOne({ name: channelName });
    if (!channel) {
      console.log(`❌ القناة غير موجودة: ${channelName}`);
      return res.status(404).send("❌ القناة غير موجودة");
    }

    req.target = channel.target; // ✅ تعيين Target الصحيح
    req.channelURL = channel.url; // ✅ تعيين URL القناة
    console.log(`✅ القناة موجودة، target: ${req.target}, url: ${req.channelURL}`);

    next();
  } catch (err) {
    console.error("❌ خطأ في البحث عن القناة:", err.message);
    res.status(500).send("⚠️ حدث خطأ في الخادم");
  }
});

// ✅ إعداد البروكسي لدعم عدة Targets
app.use(
  "/:channel",
  (req, res, next) => {
    if (!req.channelURL || !req.target) {
      console.log("⚠️ لم يتم العثور على Target أو رابط القناة");
      return res.status(500).send("⚠️ لم يتم العثور على Target أو رابط القناة");
    }
    next();
  },
  createProxyMiddleware({
    changeOrigin: true,
    ws: true,
    selfHandleResponse: false,
    router: (req) => req.target, // ✅ استخدام Target الصحيح لكل قناة
    onProxyReq: (proxyReq, req, res) => {
      console.log(`📡 يتم إعادة التوجيه إلى target: ${req.target}, الرابط: ${req.channelURL}`);
    },
  })
);

// ✅ تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
});