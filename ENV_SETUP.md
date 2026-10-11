# Environment Variables Setup Guide

## สรุปสั้นๆ: อะไรอยู่ที่ไหน

### 1. Supabase (Database & Auth)
**ใช้แค่ 3 ตัวนี้:**
- `NEXT_PUBLIC_SUPABASE_URL` - URL ของ Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key สำหรับ browser
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key สำหรับ server (อย่าให้หลุดไป browser!)

**ที่มา:** Supabase Dashboard → Project Settings → API

### 2. AI Service (MaxPlusAI)
**ใช้ 5 ตัวนี้:**
- `MAXPLUSAI_BASE_URL` - `https://api.maxplus-ai.cc`
- `MAXPLUSAI_POOL` - `claude-native`
- `MAXPLUSAI_API_KEY` - API key ของคุณ
- `AI_PROVIDER` - `maxplus`
- `AI_MODEL` - `claude-opus-5`

**ที่มา:** MaxPlusAI Dashboard

---

## ไฟล์ที่ต้องตั้งค่า

### ในเครื่องตัวเอง (Local Development)
**ไฟล์:** `.env.local`
```bash
# AI Service
MAXPLUSAI_BASE_URL=https://api.maxplus-ai.cc
MAXPLUSAI_POOL=claude-native
MAXPLUSAI_API_KEY=your-key-here
AI_PROVIDER=maxplus
AI_MODEL=claude-opus-5

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### บน Vercel (Production)
**ตั้งค่าที่:** Vercel Dashboard → Project Settings → Environment Variables

**ตัวแปรที่ต้องมี (8 ตัว):**
1. `MAXPLUSAI_BASE_URL`
2. `MAXPLUSAI_POOL`
3. `MAXPLUSAI_API_KEY`
4. `AI_PROVIDER`
5. `AI_MODEL`
6. `NEXT_PUBLIC_SUPABASE_URL`
7. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
8. `SUPABASE_SERVICE_ROLE_KEY`

---

## ตัวแปรที่ใน Vercel ตอนนี้ (ควรลบ)

**ซ้ำซ้อนและไม่ได้ใช้:**
- ❌ `SUPABASE_SECRET_KEY` - ไม่มีในโค้ด
- ❌ `SUPABASE_ANON_KEY` - ใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` แทน
- ❌ `SUPABASE_URL` - ใช้ `NEXT_PUBLIC_SUPABASE_URL` แทน
- ❌ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - ใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` แทน
- ❌ `SUPABASE_PUBLISHABLE_KEY` - ไม่มีในโค้ด
- ❌ `POSTGRES_*` (13 ตัว) - ใช้ได้ก็จริง แต่โค้ดไม่ได้เรียกตรงๆ (ใช้ผ่าน Supabase client แทน)

---

## โครงสร้างโค้ด

### Client-side (Browser)
**ไฟล์:** `src/lib/supabase.ts`
- ใช้ `NEXT_PUBLIC_SUPABASE_URL`
- ใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ปลอดภัย: ใช้ได้ในหน้าเว็บ

### Server-side (API Routes)
**ไฟล์:** `src/lib/supabase-admin.ts`
- ใช้ `NEXT_PUBLIC_SUPABASE_URL`
- ใช้ `SUPABASE_SERVICE_ROLE_KEY`
- **อันตราย:** อย่า import จาก client component!

### AI Service
**ไฟล์:** `src/lib/ai.ts`
- ใช้ `MAXPLUSAI_*` และ `AI_*` ทั้งหมด
- เรียกใช้ได้แค่ฝั่ง server

---

## วิธีทำความสะอาด Vercel Environment Variables

```bash
# 1. ลบตัวที่ซ้ำซ้อน
vercel env rm SUPABASE_SECRET_KEY production
vercel env rm SUPABASE_ANON_KEY production
vercel env rm SUPABASE_ANON_KEY preview
vercel env rm SUPABASE_URL production
vercel env rm SUPABASE_URL preview
vercel env rm NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env rm NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview
vercel env rm SUPABASE_PUBLISHABLE_KEY production
vercel env rm SUPABASE_PUBLISHABLE_KEY preview

# 2. ลบ POSTGRES_* ถ้าไม่ได้ใช้ (13 ตัว)
# (ข้ามไปก่อนถ้าไม่แน่ใจ)

# 3. Redeploy
vercel --prod
```

---

## เช็คว่าทุกอย่างใช้งานได้

### ในเครื่อง
```bash
npm run dev
# เปิด http://localhost:3000/login
# ลอง login ด้วย Google
```

### Production
```bash
# เปิด https://tuydui.vercel.app/login
# ลอง login ด้วย Google
```

---

## คำเตือน Security

1. **อย่าเผย `SUPABASE_SERVICE_ROLE_KEY`** - key นี้ข้ามการป้องกันทั้งหมด
2. **อย่าใส่ secret ใน `next.config.mjs`** - ไฟล์นี้ public และถูก commit
3. **ใช้ `NEXT_PUBLIC_*` เฉพาะ public keys** - ตัวอื่นไม่ต้องเติม prefix นี้

---

สร้างโดย Claude Opus 5.5
