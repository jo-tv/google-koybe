require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");



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
 url: { type: String, required: true }
});

const Channel = mongoose.model("canal", channelSchema);

const userSchema = new mongoose.Schema({
 email: { type: String, required: true, unique: true },
 password: { type: String, required: true }, // كلمة المرور سيتم تشفيرها
});

const User = mongoose.model("User", userSchema);

// إعداد محرك القوالب ejs
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));  // تحديد المسار الصحيح لمجلد القوالب


// 🔹 إعداد الجلسات
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
 res.render("err");  // تأكد أن لديك ملف login.ejs
});

// app.get("/reg", (req, res) => {
//  res.render("reg");  // تأكد أن لديك ملف login.ejs
// });


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

app.post("/register", async (req, res) => {
 const { email, password } = req.body;

 try {
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.redirect("/login?error=⚠️ البريد الإلكتروني مسجل بالفعل");

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({ email, password: hashedPassword });

  res.redirect("/login?message=✅ تم التسجيل بنجاح! يمكنك تسجيل الدخول الآن.");
 } catch (err) {
  console.error("❌ خطأ أثناء التسجيل:", err);
  res.redirect("/login?error=⚠️ حدث خطأ أثناء إنشاء الحساب");
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
// إضافة قناة جديدة
app.post("/add", requireAuth, async (req, res) => {
 const { name, url } = req.body;
 if (!name || !url) return res.redirect("/?error=❌ يرجى إدخال اسم القناة والرابط");

 try {
  const existingChannel = await Channel.findOne({ name });
  if (existingChannel) {
   return res.redirect("/?error=⚠️ القناة موجودة بالفعل");
  }

  await Channel.create({ name, url });
  res.redirect("/list?message=✅ تمت إضافة القناة بنجاح!");
 } catch (error) {
  console.error("❌ خطأ أثناء إضافة القناة:", error);
  res.redirect("/list?error=⚠️ حدث خطأ أثناء إضافة القناة");
 }
});

// حذف قناة
app.post("/delete", requireAuth, async (req, res) => {
 const { name } = req.body;
 try {
  await Channel.deleteOne({ name });
  res.redirect("/list?message= channel deleted 🗑️🗑️🗑️🗑️🗑️");
 } catch (error) {
  console.error("❌ خطأ أثناء حذف القناة:", error);
  res.redirect("/list?error= ererr channel is not delete 👌👌👌");
 }
});

const { PassThrough } = require("stream");


app.get("/:channel", async (req, res) => {
  const channelName = req.params.channel;

  try {
    const channel = await Channel.findOne({ name: channelName });

    if (!channel) {
      return res.status(404).send("❌ القناة غير موجودة");
    }

    const streamURL = channel.url;
    console.log(`🎥 جلب البث من: ${streamURL}`);

    const response = await axios({
      method: "get",
      url: streamURL,
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "*/*",
        "Referer": streamURL,
        "Origin": new URL(streamURL).origin,
        "Connection": "keep-alive",
      },
      maxRedirects: 10,
    });

    const stream = new PassThrough();
    response.data.pipe(stream);

    // ✅ تمرير جميع الهيدرز القادمة من المصدر
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    stream.pipe(res);
  } catch (err) {
    console.error("❌ خطأ في البث:", err.message);
    res.status(500).send("⚠️ حدث خطأ في البث");
  }
});
// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ الخادم يعمل على http://localhost:${PORT}`));