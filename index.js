require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // للملفات الثابتة (CSS, JS)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات
mongoose.connect(
 "mongodb+srv://josefuccef7:gHkpeNOLUzOvawuh@cluster0.qmwgw.mongodb.net/alldata?retryWrites=true&w=majority&appName=Cluster0"
).then(() => console.log("✅ متصل بقاعدة البيانات"))
 .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));


// نموذج القنوات
const channelSchema = new mongoose.Schema({
 name: { type: String, required: true, unique: true },
 url: { type: String, required: true },
 target: { type: String, required: true }  // ✅ إضافة `target`
});

const Channel = mongoose.model("canal", channelSchema);

// نموذج المستخدم
const userSchema = new mongoose.Schema({
 email: { type: String, required: true, unique: true },
 password: { type: String, required: true }, // كلمة المرور سيتم تشفيرها
});

const User = mongoose.model("User", userSchema);

// إعداد محرك القوالب ejs
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));  // تحديد المسار الصحيح لمجلد القوالب

// إعداد الجلسات
app.use(session({
 secret: "supersecretkey",  // مفتاح تشفير الجلسات
 resave: false,
 saveUninitialized: true
}));

const requireAuth = (req, res, next) => {
 if (!req.session.user) {
  return res.redirect("/login?error=⚠️ يجب تسجيل الدخول أولاً");
 }
 next();
};

// 🔹 عرض صفحة تسجيل الدخول
app.get("/login", (req, res) => {
 res.render("login");  // تأكد أن لديك ملف login.ejs
});

app.get("/", (req, res) => {
 res.render("err");  // تأكد أن لديك ملف err.ejs
});

// 🔹 التحقق من بيانات تسجيل الدخول
app.post("/login", async (req, res) => {
 const { email, password } = req.body;

 try {
  const user = await User.findOne({ email });
  if (!user) return res.redirect("/login?error=❌ البريد الإلكتروني غير مسجل");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.redirect("/login?error=❌ كلمة المرور غير صحيحة");

  // ✅ نجاح تسجيل الدخول
  req.session.user = user;  // حفظ المستخدم في الجلسة
  res.redirect("/list");  // تحويل إلى الصفحة المحمية
 } catch (err) {
  console.error("❌ خطأ في تسجيل الدخول:", err);
  res.redirect("/login?error=⚠️ حدث خطأ أثناء تسجيل الدخول");
 }
});

// 🔹 صفحة الإدارة
app.get("/list", requireAuth, async (req, res) => {
 try {
  const channels = await Channel.find(); // جلب القنوات من قاعدة البيانات
  const message = req.query.message || ''; // جلب رسالة النجاح من الاستعلام (إن وجدت)
  const error = req.query.error || ''; // جلب رسالة الخطأ من الاستعلام (إن وجدت)
  res.render("home", { channels, message, error }); // تمرير القنوات والرسائل إلى الملف home.ejs
 } catch (error) {
  console.error("❌ خطأ في جلب القنوات:", error);
  res.status(500).send("⚠️ حدث خطأ أثناء تحميل القنوات");
 }
});

// 🔹 إضافة قناة جديدة
app.post("/add", requireAuth, async (req, res) => {
 const { name, url, target } = req.body;

 if (!name || !url || !target) {
  return res.redirect("/list?error=❌ يرجى إدخال جميع الحقول!");
 }

 try {
  const existingChannel = await Channel.findOne({ name });
  if (existingChannel) {
   return res.redirect("/list?error=⚠️ القناة موجودة بالفعل");
  }

  // ✅ حفظ القناة مع `target` في قاعدة البيانات
  await Channel.create({ name, url, target });

  res.redirect("/list?message=✅ تمت إضافة القناة بنجاح!");
 } catch (error) {
  console.error("❌ خطأ أثناء إضافة القناة:", error);
  res.redirect("/list?error=⚠️ حدث خطأ أثناء إضافة القناة");
 }
});

// 🔹 حذف قناة
app.post("/delete", requireAuth, async (req, res) => {
 const { name } = req.body;
 try {
  await Channel.deleteOne({ name });
  res.redirect("/list?message=✅ تم حذف القناة بنجاح");
 } catch (error) {
  console.error("❌ خطأ أثناء حذف القناة:", error);
  res.redirect("/list?error=⚠️ حدث خطأ أثناء حذف القناة");
 }
});

// app.use(
//  "/:channel",
//  async (req, res, next) => {
//   const channelName = req.params.channel;
// 
//   try {
//    const channel = await Channel.findOne({ name: channelName });
//    if (!channel) {
//     return res.status(404).send("❌ القناة غير موجودة");
//    }
// 
//    // ✅ التأكد من وجود `target`، وإلا استخدام دومين افتراضي
//    const target = channel.target || new URL(channel.url).origin;
// 
//    console.log(`🔗 جلب القناة: ${channel.url}`);
//    console.log(`🎯 target المستخرج: ${target}`);
// 
//    req.channelURL = channel.url;
//    req.channelTarget = target;
// 
//    next();
//   } catch (err) {
//    console.error("❌ خطأ في البحث عن القناة:", err.message);
//    res.status(500).send("⚠️ حدث خطأ في الخادم");
//   }
//  },
//  createProxyMiddleware({
//   changeOrigin: true,
//   ws: true,
//   router: (req) => req.channelTarget, // ✅ استخدام `target` المستخرج
//   pathRewrite: (path, req) => {
//    return req.channelURL.replace(req.channelTarget, ""); // ✅ إزالة `target` من الرابط
//   },
//   onProxyReq: (proxyReq, req, res) => {
//    proxyReq.setHeader("User-Agent", "655667767"); // ✅ تمرير User-Agent
//   },
//   onError: (err, req, res) => {
//    console.error("❌ خطأ في البروكسي:", err.message);
//    res.status(500).send("⚠️ حدث خطأ أثناء معالجة الطلب");
//   }
//  })
// );

// 🟢 الروابط المتاحة للبث
const streamSources = [
  "http://173.212.193.243:8080/PbiEANUeb5/94UU7bDVJu/",
];

// 🔹 مسار بث القناة
app.get('/josef/stream/:channel', async (req, res) => {
  const channel = req.params.channel;

  // تحقق من إتاحة الرابط
  for (let i = 0; i < streamSources.length; i++) {
    const originalUrl = `${streamSources[i]}${channel}`;

    try {
      console.log(`🔄 تجربة الرابط: ${originalUrl}`);

      // قم بتحديد رؤوس الطلب لتقليل استهلاك البيانات عبر دعم الضغط
      const response = await axios({
        method: 'get',
        url: originalUrl,
        responseType: 'stream',
        headers: {
          'Accept-Encoding': 'gzip, deflate, br', // ضغط البيانات
        },
        timeout: 30000, // زيادة المهلة إلى 30 ثانية
      });

      console.log(`✅ البث يعمل من المصدر ${i + 1}`);
      
      // إرسال البيانات المضغوطة إلى المستخدم
      response.data.pipe(res);
      return; // نوقف العملية بمجرد العثور على رابط شغال
    } catch (err) {
      console.error(`❌ المصدر ${i + 1} لا يعمل، المحاولة التالية...`);
    }
  }

  res.status(500).send("⚠️ جميع المصادر غير متاحة حاليًا");
});

// تشغيل الخادم على المنفذ 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ الخادم يعمل على http://localhost:${PORT}`));