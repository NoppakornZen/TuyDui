# Migration: Collaboration System

## ขั้นตอนการติดตั้ง:

1. เปิด **Supabase Dashboard**: https://supabase.com/dashboard/project/ebwrmwnphlvicwxsqyqn/editor
2. คลิก **"SQL Editor"** (เมนูซ้าย)
3. คลิก **"New query"**
4. Copy ทั้งหมดจากไฟล์ `supabase/migrations/003_rls_policies.sql` (ไฟล์นี้แก้ของ 002 ให้ด้วย รันซ้ำได้)
5. Paste ลงใน SQL Editor
6. กด **"Run"**

## สิ่งที่ Migration นี้จะเพิ่ม:

### Tables:
- `project_members` - เก็บคนที่เข้าร่วม project
- `project_invites` - เก็บ invite link ที่สร้าง

### Roles:
- **Owner** - เจ้าของ project (ทำได้ทุกอย่าง)
- **Editor** - แก้ไขได้ (map, requirements, changes)
- **Viewer** - ดูอย่างเดียว (ไม่สามารถแก้ไขได้)

### Features:
- Share link แบบ Canva (สร้าง link แล้วส่งให้เพื่อน)
- Invite link มีอายุ 7 วัน
- จำกัดจำนวนครั้งที่ใช้ link ได้ (optional)
- Owner สามารถเปลี่ยน role ของ member
- Owner สามารถลบ member ออก

## หลัง Run Migration แล้ว:
จะเริ่มสร้าง UI สำหรับ:
1. แสดงรายชื่อ members ใน project
2. ปุ่ม "Share" สำหรับสร้าง invite link
3. จัดการ members (เปลี่ยน role, ลบออก)
