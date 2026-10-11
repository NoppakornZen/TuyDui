# Setup Guide - TuyDui Production Deployment

## ✅ สิ่งที่ทำเสร็จแล้ว

1. ✅ ติดตั้ง Supabase integration บน Vercel
2. ✅ เพิ่ม authentication และ rate limiting ทุก API route
3. ✅ สร้างหน้า Login ด้วย Google OAuth
4. ✅ จำกัดการใช้งาน AI: 10 requests/day, 5 requests/hour
5. ✅ โครงสร้าง database schema พร้อมใน `supabase/migrations/001_initial.sql`

## 🔧 สิ่งที่ต้องทำเพื่อให้ใช้งานได้จริง (5-10 นาที)

### ขั้นตอนที่ 1: เปิด Google OAuth ใน Supabase (3 นาที)

1. ไปที่ https://supabase.com/dashboard/project/ebwrmwnphlvicwxsqyqn/auth/providers
2. หา **Google** provider → คลิก **Enable**
3. คุณจะได้ Redirect URL อยู่ในหน้านั้น (จะเป็น `https://ebwrmwnphlvicwxsqyqn.supabase.co/auth/v1/callback`)
4. **สร้าง Google OAuth Client:**
   - ไปที่ https://console.cloud.google.com/apis/credentials
   - คลิก **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: วาง URL จาก Supabase (ขั้นตอน 3)
   - คัดลอก **Client ID** และ **Client Secret**
5. กลับไปหน้า Supabase → วาง Client ID และ Client Secret → **Save**

### ขั้นตอนที่ 2: รัน Database Migration (2 นาที)

1. ไปที่ https://supabase.com/dashboard/project/ebwrmwnphlvicwxsqyqn/sql/new
2. เปิดไฟล์ `supabase/migrations/001_initial.sql` ในโปรเจกต์นี้
3. คัดลอกเนื้อหาทั้งหมด → วางใน SQL Editor
4. คลิก **Run** (หรือ Ctrl+Enter)
5. ถ้าเห็น "Success. No rows returned" แสดงว่าสำเร็จ

### ขั้นตอนที่ 3: Deploy ไป Production

```bash
npm run build
vercel --prod
```

หรือถ้าใช้ Vercel Git Integration ก็แค่ push ไป main branch:

```bash
git add .
git commit -m "Add authentication and rate limiting"
git push origin main
```

## ✅ ทดสอบว่าใช้งานได้

1. เปิด https://tuydui.vercel.app
2. คลิก "เข้าสู่ระบบด้วย Google"
3. อนุญาต Google account
4. จะถูก redirect ไปหน้า `/workspace`
5. ลองอัปโหลด PDF → ถ้าเห็น requirement ออกมาแสดงว่าใช้งานได้

## 📊 โควตาและต้นทุน

**ฟรี tier ที่ตั้งไว้:**
- 10 requests ต่อวันต่อผู้ใช้
- 5 requests ต่อชั่วโมงต่อผู้ใช้
- ถ้าเกินจะเห็น error "Rate limit exceeded"

**ต้นทุนโดยประมาณ (ถ้ามีผู้ใช้ 100 คน ใช้เต็มโควตา):**
- 100 users × 10 requests/day = 1,000 requests/day
- Claude Opus 5 ราคาประมาณ $15 per million input tokens
- แต่ละ request ใช้ประมาณ 2,000-5,000 tokens
- ต้นทุน: ~$15-30/เดือน

## 🔐 ความปลอดภัย

✅ **ทำแล้ว:**
- API key อยู่ฝั่ง server (ไม่ถูกส่งไปฝั่ง client)
- ต้อง login ก่อนใช้ทุก AI feature
- Rate limiting ป้องกันการใช้งานมากเกินไป
- Authorization header ตรวจสอบทุก request

❌ **ยังไม่ได้ทำ (แต่ควรทำถ้าขาย):**
- ระบบชำระเงิน (Stripe/Omise)
- Email confirmation
- ระบุ Terms of Service และ Privacy Policy อย่างละเอียด
- HTTPS-only cookies
- CSRF protection
- Monitoring และ alerting

## 📝 หน้าที่ยังไม่มี (แต่ควรมี)

1. **Dashboard:** แสดงโควตาที่เหลือ, project ทั้งหมด
2. **Pricing page:** แพ็กเกจฟรีและเสียเงิน
3. **Terms of Service & Privacy Policy:** จำเป็นถ้าเก็บข้อมูลจริง
4. **Settings:** เปลี่ยนรหัสผ่าน, ลบบัญชี
5. **Team workspace:** แชร์ project ให้คนอื่น

## 🚀 ขั้นตอนถัดไป (ถ้าจะขายจริง)

1. ทดสอบกับผู้ใช้จริง 10-20 คน (ให้ใช้ฟรีก่อน)
2. เก็บ feedback ว่า feature ไหนขาด
3. เพิ่ม baseline ที่ล็อกไม่ให้แก้ + audit log
4. ใส่ระบบชำระเงิน (Stripe)
5. เขียน Terms & Privacy ให้ถูกกฎหมาย
6. Marketing และหา product-market fit

---

**หมายเหตุ:** ตอนนี้ app พร้อมให้คนเข้ามาลองใช้แล้ว แต่ยังไม่พร้อม**ขาย** เพราะยังไม่มีระบบชำระเงินและ legal documents
