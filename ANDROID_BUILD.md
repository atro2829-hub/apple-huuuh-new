# 🤖 Android Build Instructions

## بناء APK و AAB لـ Apple NET

### الطريقة السهلة (GitHub Actions):

1. اذهب إلى **Actions** في هذا المستودع
2. اختر **🚀 Build Android APK & AAB**
3. اضغط **Run workflow**
4. اكتب رابط خادم تطبيقك (مثال: https://your-domain.com)
5. اضغط **Run workflow** وانتظر ~10 دقائق
6. حمّل الملفات من قسم **Artifacts**

### الملفات الناتجة:
- `Apple-NET-v1.0-signed.apk` — للتثبيت المباشر على الأجهزة
- `Apple-NET-v1.0.aab` — للنشر على **Google Play Console**

### للنشر على Google Play:
1. سجّل دخول إلى [Google Play Console](https://play.google.com/console)
2. أنشئ تطبيقاً جديداً أو اختر الموجود
3. اذهب إلى **Production** → **Create new release**
4. ارفع ملف `.aab`
5. أكمل المعلومات المطلوبة وانشر

---
🔑 الـ Keystore محفوظ كـ GitHub Secret (مشفّر وآمن)
