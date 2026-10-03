# 🎯 คู่มือ Setup TuyDui แบบละเอียด (ฉบับเข้าใจง่าย)

**เวลาที่ใช้ทั้งหมด: 10 นาที**  
**ความยากง่าย: ⭐⭐☆☆☆ (ง่าย - แค่คัดลอกวาง)**

---

## 📌 ภาพรวม: คุณต้องทำอะไร?

TuyDui ตอนนี้ต้องการ 2 สิ่งก่อนจะใช้งานได้:

1. **ระบบ Login** - ให้คนเข้าเว็บแล้ว login ด้วย Google ได้
2. **ฐานข้อมูล** - เก็บข้อมูลผู้ใช้และโปรเจกต์

ทั้ง 2 อย่างนี้ใช้ **Supabase** ซึ่งคุณติดตั้งไว้แล้ว แต่ยังไม่ได้เปิดใช้งาน

---

## 🔐 Part 1: เปิดระบบ Login ด้วย Google (5 นาที)

### ทำไมต้องทำ?
- ตอนนี้เว็บมีหน้า Login แล้ว แต่ยังกดปุ่ม "เข้าสู่ระบบด้วย Google" ไม่ได้
- เพราะ Supabase ยังไม่รู้จัก Google account ของคุณ
- เราต้องเชื่อม Google กับ Supabase

---

### ขั้นตอนที่ 1.1: เข้า Supabase Dashboard

1. **เปิด browser** (Chrome, Edge, Firefox อะไรก็ได้)

2. **คัดลอก URL นี้แล้ววางใน address bar:**
   ```
   https://supabase.com/dashboard/project/ebwrmwnphlvicwxsqyqn/auth/providers
   ```

3. **กด Enter** - คุณจะเห็นหน้าแบบนี้:

   ```
   ┌─────────────────────────────────────────┐
   │ Authentication Providers                │
   │                                         │
   │ Email                    [Enabled]      │
   │ Phone                    [Disabled]     │
   │ → Google                 [Disabled] ← นี่ │
   │ GitHub                   [Disabled]     │
   │ ...                                     │
   └─────────────────────────────────────────┘
   ```

4. **หา Google** (มีโลโก้ Google ข้างๆ)

5. **กดที่แถว Google** - จะเห็นฟอร์มเด้งขึ้นมา

---

### ขั้นตอนที่ 1.2: จด Redirect URL

1. **ในฟอร์มที่เด้งขึ้นมา** คุณจะเห็น:
   ```
   ┌────────────────────────────────────────────┐
   │ Google OAuth Configuration                 │
   │                                            │
   │ Callback URL (Redirect URI):               │
   │ https://ebwrmwnphlvicwxsqyqn.supabase.co/  │
   │ auth/v1/callback                           │
   │                              [Copy] ← กดนี่  │
   └────────────────────────────────────────────┘
   ```

2. **กดปุ่ม Copy** (หรือคัดลอกด้วยมือ)

3. **เปิด Notepad** (Windows) หรือ Notes (Mac) แล้ว **วาง URL ไว้ก่อน**

4. **อย่าปิดหน้านี้** - เดี๋ยวจะกลับมาใส่ข้อมูล

---

### ขั้นตอนที่ 1.3: สร้าง Google OAuth Client

1. **เปิดแท็บใหม่** ใน browser

2. **คัดลอก URL นี้แล้ววาง:**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

3. **กด Enter** - คุณจะเห็นหน้าแบบนี้:
   ```
   ┌──────────────────────────────────────┐
   │ Google Cloud Console                 │
   │ Credentials                          │
   │                                      │
   │ [+ CREATE CREDENTIALS] ← กดนี่        │
   └──────────────────────────────────────┘
   ```

4. **กดปุ่ม "CREATE CREDENTIALS"** (สีน้ำเงิน ด้านบน)

5. **เลือก "OAuth client ID"** จากเมนู dropdown

---

### ขั้นตอนที่ 1.4: ตั้งค่า OAuth Client

**ถ้าคุณเห็น "Configure Consent Screen" ให้ทำก่อน:**

1. กด "Configure Consent Screen"
2. เลือก **External** → กด Next
3. ใส่:
   - App name: `TuyDui`
   - User support email: **อีเมลของคุณ**
   - Developer contact: **อีเมลของคุณ**
4. กด Save and Continue จนจบ
5. กลับมาหน้า Credentials แล้วกด "+ CREATE CREDENTIALS" อีกครั้ง

**ตอนนี้จะเห็นฟอร์มแบบนี้:**

```
┌─────────────────────────────────────────────┐
│ Create OAuth client ID                      │
│                                             │
│ Application type:                           │
│ [Web application] ← เลือกนี่                 │
│                                             │
│ Name:                                       │
│ TuyDui Production ← พิมพ์นี่                │
│                                             │
│ Authorized redirect URIs:                   │
│ [+ ADD URI] ← กดนี่                         │
│                                             │
│ [CREATE] ← ยังไม่กด รอก่อน                   │
└─────────────────────────────────────────────┘
```

1. **Application type**: เลือก **Web application**

2. **Name**: พิมพ์ `TuyDui Production`

3. **กดปุ่ม "+ ADD URI"** ใต้ Authorized redirect URIs

4. **วาง URL** ที่คุณ copy มาจาก Supabase (ข้อ 1.2)
   ```
   https://ebwrmwnphlvicwxsqyqn.supabase.co/auth/v1/callback
   ```

5. **กดปุ่ม CREATE** (สีน้ำเงิน)

---

### ขั้นตอนที่ 1.5: คัดลอก Client ID และ Secret

1. **หลังจากกด CREATE** จะเห็นป๊อปอัพแบบนี้:
   ```
   ┌──────────────────────────────────────┐
   │ OAuth client created                 │
   │                                      │
   │ Your Client ID                       │
   │ 123456789-abc.apps.googleusercontent │
   │ .com                        [Copy]   │
   │                                      │
   │ Your Client Secret                   │
   │ GOCSPX-aBcDeFgHiJkLmN      [Copy]   │
   │                                      │
   │                           [OK]       │
   └──────────────────────────────────────┘
   ```

2. **กด Copy** ข้าง **Client ID**  
   → วางใน Notepad บรรทัดใหม่

3. **กด Copy** ข้าง **Client Secret**  
   → วางใน Notepad บรรทัดใหม่

4. **ใน Notepad ตอนนี้คุณจะมี 3 บรรทัด:**
   ```
   https://ebwrmwnphlvicwxsqyqn.supabase.co/auth/v1/callback
   123456789-abc.apps.googleusercontent.com
   GOCSPX-aBcDeFgHiJkLmN
   ```

5. **กด OK** ใน popup

---

### ขั้นตอนที่ 1.6: ใส่ข้อมูลกลับไปที่ Supabase

1. **กลับไปแท็บ Supabase** (ที่คุณเปิดทิ้งไว้ตั้งแต่ข้อ 1.2)

2. **ใส่ข้อมูลในฟอร์ม:**
   ```
   ┌────────────────────────────────────────┐
   │ Google OAuth Configuration             │
   │                                        │
   │ Client ID (for OAuth)                  │
   │ [วาง Client ID ที่ copy มา]            │
   │                                        │
   │ Client Secret (for OAuth)              │
   │ [วาง Client Secret ที่ copy มา]        │
   │                                        │
   │                         [Save]         │
   └────────────────────────────────────────┘
   ```

3. **วาง Client ID** จาก Notepad ลงในช่องแรก

4. **วาง Client Secret** จาก Notepad ลงในช่องที่สอง

5. **กดปุ่ม Save** (สีเขียว)

6. **เห็นข้อความ "Successfully saved"** แสดงว่าสำเร็จ! ✅

---

## 🗄️ Part 2: เปิดใช้งานฐานข้อมูล (3 นาที)

### ทำไมต้องทำ?
- ตอนนี้ Supabase มีฐานข้อมูลเปล่าๆ ยังไม่มีตาราง
- เราต้อง "สร้างตาราง" เพื่อเก็บข้อมูลผู้ใช้ โปรเจกต์ requirement ต่างๆ

---

### ขั้นตอนที่ 2.1: เปิด SQL Editor

1. **คัดลอก URL นี้:**
   ```
   https://supabase.com/dashboard/project/ebwrmwnphlvicwxsqyqn/sql/new
   ```

2. **วางใน browser แล้วกด Enter**

3. **คุณจะเห็นหน้าจอแบบนี้:**
   ```
   ┌──────────────────────────────────────────────┐
   │ SQL Editor                                   │
   │ ┌──────────────────────────────────────────┐ │
   │ │ -- Enter your SQL here                   │ │
   │ │                                          │ │
   │ │                                          │ │
   │ │                                          │ │
   │ └──────────────────────────────────────────┘ │
   │                                   [RUN]      │
   └──────────────────────────────────────────────┘
   ```

---

### ขั้นตอนที่ 2.2: เปิดไฟล์ Migration

1. **เปิด File Explorer** (โฟลเดอร์ Windows)

2. **ไปที่:**
   ```
   C:\Users\Zen\Desktop\!BriefDiff\supabase\migrations
   ```

3. **หาไฟล์ชื่อ:** `001_initial.sql`

4. **ดับเบิ้ลคลิก** เพื่อเปิดด้วย Notepad หรือ VS Code

5. **กด Ctrl+A** (เลือกทั้งหมด)

6. **กด Ctrl+C** (คัดลอก)

---

### ขั้นตอนที่ 2.3: รัน Migration

1. **กลับไปที่ Supabase SQL Editor** (ในบราวเซอร์)

2. **คลิกในกล่องสีดำ** (ที่เขียนโค้ด)

3. **กด Ctrl+V** (วาง) - จะเห็นโค้ดเยอะมาก ประมาณ 200 บรรทัด

4. **อย่าตกใจ! ไม่ต้องเข้าใจโค้ด แค่กด RUN**

5. **กดปุ่ม RUN** (หรือกด Ctrl+Enter)

6. **รอประมาณ 2-3 วินาที**

7. **เห็นข้อความ:**
   ```
   ✅ Success. No rows returned
   ```
   หรือ
   ```
   ✅ Success
   ```

8. **แสดงว่าสำเร็จ!** ✅

---

## ✅ Part 3: ทดสอบว่าใช้งานได้ (2 นาที)

### ขั้นตอนที่ 3.1: รอ Vercel Deploy

1. **เปิด URL นี้:**
   ```
   https://vercel.com/zens-projects-26707d96/tuydui/deployments
   ```

2. **ดู deployment ล่าสุด:**
   - ถ้าเห็น **"Building..."** หรือ **"Running..."** = **รออีกนิดนึง**
   - ถ้าเห็น **"Ready"** พร้อมเครื่องหมายถูกสีเขียว = **พร้อมแล้ว!**

3. **ใช้เวลาประมาณ 1-2 นาที**

---

### ขั้นตอนที่ 3.2: ทดสอบเว็บ

1. **เปิด URL หลักของคุณ:**
   ```
   https://tuydui.vercel.app
   ```

2. **คุณจะเห็นหน้า Login แบบนี้:**
   ```
   ┌─────────────────────────────────┐
   │                                 │
   │         TuyDui                  │
   │                                 │
   │  [🔵 เข้าสู่ระบบด้วย Google]    │
   │                                 │
   └─────────────────────────────────┘
   ```

3. **กดปุ่ม "เข้าสู่ระบบด้วย Google"**

4. **เลือก Google account** ของคุณ

5. **Google จะถาม "TuyDui wants to access..."** → กด **Allow** หรือ **อนุญาต**

6. **คุณจะถูก redirect ไปหน้า:**
   ```
   https://tuydui.vercel.app/workspace
   ```

7. **เห็นหน้า workspace** = **สำเร็จ!** 🎉

---

### ขั้นตอนที่ 3.3: ทดสอบ AI

1. **ในหน้า workspace** ลอง:
   - อัปโหลด PDF brief
   - หรือวางข้อความ

2. **กดปุ่ม "Generate" หรือ "วิเคราะห์"**

3. **ถ้าเห็น requirement map ออกมา** = **ใช้งานได้เต็มรูปแบบ!** ✅

---

## 🎯 สรุป: คุณทำอะไรไปบ้าง?

| ขั้นตอน | สิ่งที่ทำ | เวลา |
|---------|-----------|------|
| Part 1 | เชื่อม Google OAuth กับ Supabase | 5 นาที |
| Part 2 | สร้างตารางฐานข้อมูล | 3 นาที |
| Part 3 | ทดสอบว่าใช้งานได้ | 2 นาที |
| **รวม** | | **10 นาที** |

---

## 🐛 แก้ปัญหา: ถ้าอะไรไม่ work

### ปัญหา 1: กด Login แล้วไม่มีอะไรเกิดขึ้น

**สาเหตุ:** Google OAuth ยังไม่ได้ setup

**แก้ไข:**
1. กลับไปทำ Part 1 ใหม่ตั้งแต่ต้น
2. ตรวจว่า Client ID และ Secret ใส่ถูกใน Supabase แล้ว
3. ลอง refresh หน้าเว็บ (กด F5)

---

### ปัญหา 2: Login ได้แต่เจอ error "Table not found"

**สาเหตุ:** ฐานข้อมูลยังไม่ได้ run migration

**แก้ไข:**
1. กลับไปทำ Part 2 ใหม่
2. ตรวจว่า SQL มี error หรือไม่
3. ถ้า error บอกผม ผมช่วยแก้ให้

---

### ปัญหา 3: Vercel deploy ไม่เสร็จสักที

**สาเหตุ:** อาจจะมี error ในโค้ด (แต่ไม่น่าจะเกิด)

**แก้ไข:**
1. เปิด deployment logs ดูว่า error อะไร
2. screenshot มาให้ผม ผมแก้ให้

---

### ปัญหา 4: AI ตอบแต่ได้ผลลัพธ์แปลกๆ

**สาเหตุ:** นี่ไม่ใช่ปัญหา - AI บางครั้งตอบไม่ตรงความต้องการ

**แก้ไข:**
1. ลองอธิบาย brief ให้ชัดเจนขึ้น
2. หรือใส่ข้อมูลมากกว่าเดิม
3. ตอนนี้ AI ยังไม่ perfect - ต้องมีคนตรวจทับอีกรอบ

---

## 📞 ติดต่อ Support

**ถ้าทำตามแล้วยังไม่ได้:**
1. Screenshot หน้าจอตรงที่ติด
2. Copy error message (ถ้ามี)
3. ถามผมได้เลย

**เวลาตอบ:** ภายใน 1 ชั่วโมง (ในเวลาทำงาน)

---

## 🎉 เมื่อเสร็จแล้ว

**คุณจะมี:**
- ✅ เว็บที่ใช้งานได้จริง
- ✅ ผู้ใช้ต้อง login ก่อนใช้
- ✅ ข้อมูลถูกเก็บใน database
- ✅ มี rate limiting ป้องกันค่าใช้จ่ายระเบิด

**ขั้นตอนถัดไป:**
1. ชวนเพื่อน 5-10 คนมาลอง
2. ถามว่าเจอ bug หรือ feature ที่อยากได้
3. ตัดสินใจว่าจะทำต่อไหม

**ถ้าจะขายจริง:**
- เพิ่มระบบชำระเงิน (Stripe)
- ให้ทนายความตรวจ Privacy & Terms
- สร้างหน้า Pricing
- Marketing!

---

**คำถาม:** มีอะไรงงหรือไม่เข้าใจไหม? ถามได้เลย ผมอธิบายเพิ่มได้ครับ 😊
