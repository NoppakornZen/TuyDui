# Production Deployment Checklist

## ✅ สิ่งที่ทำเสร็จแล้วในโค้ด

### 1. Authentication & Authorization
- ✅ Google OAuth login ผ่าน Supabase Auth
- ✅ Session management ด้วย JWT
- ✅ Protected API routes (ต้อง login ก่อนเรียก AI)
- ✅ AuthProvider wrapper สำหรับทั้ง app

### 2. Rate Limiting & Cost Control
- ✅ 10 AI requests ต่อวันต่อผู้ใช้
- ✅ 5 AI requests ต่อชั่วโมงต่อผู้ใช้
- ✅ ตรวจสอบโควตาใน `/api/documents`, `/api/changes`, `/api/ai`
- ✅ Error messages ที่บอกเวลาที่จะ reset

### 3. Database Schema
- ✅ Migration script พร้อมใน `supabase/migrations/001_initial.sql`
- ✅ Tables: users, projects, documents, requirements, changes, client_notes
- ✅ Row Level Security (RLS) policies
- ✅ Indexes สำหรับ performance

### 4. Security
- ✅ API keys อยู่ฝั่ง server เท่านั้น (ไม่ส่งไปฝั่ง client)
- ✅ Authorization header ตรวจสอบทุก API call
- ✅ Input validation สำหรับ AI responses
- ✅ Environment variables แยกจาก source code

### 5. UI/UX
- ✅ หน้า Login ด้วย Google OAuth
- ✅ Redirect flow: login → callback → workspace
- ✅ Loading states
- ✅ Error messages ที่เป็นมิตร

### 6. Documentation
- ✅ `SETUP.md` - คู่มือ deploy แบบละเอียด
- ✅ `PRIVACY.md` - Privacy Policy ฉบับร่าง
- ✅ `TERMS.md` - Terms of Service ฉบับร่าง
- ✅ `README.md` - อัปเดตให้ตรงกับ production features

## 📋 ต้องทำก่อน Deploy (5-10 นาที)

### Step 1: เปิด Google OAuth (3 นาที)
1. ไปที่ Supabase Dashboard: https://supabase.com/dashboard/project/ebwrmwnphlvicwxsqyqn/auth/providers
2. เปิด Google provider
3. สร้าง OAuth credentials ที่ Google Cloud Console
4. ใส่ Client ID และ Secret ใน Supabase

### Step 2: รัน Migration (2 นาที)
1. ไปที่ Supabase SQL Editor: https://supabase.com/dashboard/project/ebwrmwnphlvicwxsqyqn/sql/new
2. Copy เนื้อหาจาก `supabase/migrations/001_initial.sql`
3. Paste และ Run

### Step 3: Deploy
```bash
git add .
git commit -m "Add authentication, rate limiting, and production-ready features"
git push origin main
```

Vercel จะ auto-deploy เมื่อ push ไป `main`

## 🎯 Next Steps หลัง Deploy

### ทดสอบทันที
1. เปิด https://tuydui.vercel.app
2. กด "เข้าสู่ระบบด้วย Google"
3. อัปโหลด PDF ลองใช้งานจริง

### ก่อนให้คนอื่นใช้
- [ ] ทดสอบ rate limiting (อัปโหลด 6 ครั้งในชั่วโมงแรก ควรถูกบล็อก)
- [ ] ทดสอบ error cases (PDF ไม่มี text, JSON invalid)
- [ ] ทดสอบบนมือถือ

### ก่อนเก็บเงิน
- [ ] เพิ่มระบบชำระเงิน (Stripe/Omise)
- [ ] ให้ทนายความตรวจ Privacy & Terms
- [ ] สร้างหน้า Pricing
- [ ] เพิ่ม email notifications
- [ ] Setup monitoring (Sentry, LogRocket)

## 📊 ต้นทุนโดยประมาณ

**ถ้ามี 100 users ที่ใช้เต็มโควตา:**
- 100 × 10 requests/day = 1,000 requests/day
- Claude Opus ประมาณ 2,000-5,000 tokens/request
- ต้นทุน: **$15-30/เดือน**

**Supabase Free Tier:**
- 500 MB database
- 50,000 monthly active users
- 2 GB bandwidth
- เพียงพอสำหรับ beta testing

## ⚠️ Known Limitations

1. **ยังไม่มีระบบชำระเงิน** - ตอนนี้ทุกคนได้ free tier
2. **AI อาจตอบผิด** - ต้องบอกผู้ใช้ให้ตรวจสอบ
3. **ไม่รองรับ PDF สแกน** - ต้องมี text layer
4. **ไม่มี team workspace** - แต่ละคนจัดการโปรเจกต์ของตัวเอง
5. **localStorage ยังใช้อยู่** - ต้อง migrate ไป database ในอนาคต

## 🔐 Security Checklist

- ✅ API keys ไม่โดน expose
- ✅ ต้อง login ก่อนใช้ AI
- ✅ Rate limiting ทำงาน
- ✅ HTTPS only (Vercel default)
- ⚠️ ยังไม่มี CSRF protection
- ⚠️ ยังไม่มี email verification
- ⚠️ ยังไม่มี 2FA

---

**Status:** พร้อมให้คนใช้ beta test แบบฟรี ✅  
**Status:** ยังไม่พร้อมขาย ⚠️ (ขาดระบบชำระเงินและ legal documents ที่สมบูรณ์)
