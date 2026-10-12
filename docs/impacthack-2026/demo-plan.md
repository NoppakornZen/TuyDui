# TuyDui — ImpactHack 2026 demo draft

ร่างสำหรับซ้อมอัดหน้าจอ ความยาวเป้าหมาย **3 นาที 20 วินาที** ไม่ใช่คลิปที่เรนเดอร์เสร็จแล้ว

แนวเรื่อง: **เห็นงานเพิ่มก่อนรับปากลูกค้า** — บรีฟเว็บไซต์เล็ก ๆ กลายเป็นคำขอเพิ่มระบบสมาชิก TuyDui ช่วยให้ทีมเห็นความต่างกับขอบเขตที่อนุมัติและตัดสินใจก่อนเปลี่ยนงาน

ภาษาอังกฤษเป็นข้อเสนอสำหรับกรรมการนานาชาติ ยังไม่ได้รับการยืนยันจากผู้ใช้ หน้า rules ที่ตรวจไม่ระบุว่าต้องใช้ภาษาอังกฤษ

## กติกาที่ตรวจจากผู้จัด

ตรวจเมื่อ 7 ตุลาคม 2026:

- [หน้ารายการและข้อกำหนดเดโม](https://impacthack26.devpost.com/): คลิป **2–4 นาที** อธิบายปัญหา โชว์ของจริง ฟีเจอร์หลัก การใช้ AI/เทคโนโลยี และคุณค่าของงาน ส่วนใหญ่ต้องเป็นการสาธิตผลิตภัณฑ์ อัดหน้าจอพร้อมบรรยายได้
- [Rules](https://impacthack26.devpost.com/rules): ผู้สมัครต้องเป็นนักเรียนมัธยมในปัจจุบัน สมัครเดี่ยวหรือทีมไม่เกิน 4 คน งานเดิมใช้เป็นฐานได้ แต่ต้องมีส่วนพัฒนาใหม่ที่มีนัยสำคัญระหว่าง ImpactHack
- [Schedule](https://impacthack26.devpost.com/details/dates): แข่งขัน 1–7 ตุลาคม 2026 ตาม PDT ปิดรับ **7 ตุลาคม 23:45 PDT = 8 ตุลาคม 13:45 ไทย / 15:45 ญี่ปุ่น**
- เกณฑ์: Impact 20%, Technical Execution 20%, Innovation 15%, Functionality 15%, AI & Technology 15%, Presentation & Demo 15%
- ต้องส่งชื่อ คำอธิบาย ปัญหา วิธีทำงาน เทคโนโลยีและ AI ที่ใช้ ภาพหน้าจอ ลิงก์ source code และเดโม

ต้องยืนยันสถานะผู้สมัครและสิ่งที่พัฒนาในช่วงแข่งขันก่อนระบุว่ามีสิทธิ์ส่ง หน้า overview มีข้อความเรื่องอายุบรรลุนิติภาวะ ขณะที่ rules ระบุนักเรียนมัธยม หากอายุมีข้อสงสัยให้ตรวจเงื่อนไขสมัครกับผู้จัด

## เตรียมก่อนอัด

1. ใช้โปรเจกต์ใหม่สำหรับเดโม ชื่อ `Northstar Studio Website` ลูกค้า `Northstar Studio` บรีฟและชื่อเหล่านี้เป็นข้อมูลสมมติสำหรับสาธิต
2. ใช้แอปเวอร์ชันที่จะส่งจริง: [Hosted app](https://tuydui.vercel.app) หรือ local ที่ตั้งค่า AI/Supabase และ migrations แล้ว ล็อกอินด้วยบัญชีเจ้าของให้เรียบร้อย
3. อัดแนวนอน 1920×1080 ถ้าทำได้ ขยายตัวอักษรจนอ่านผลวิเคราะห์และชื่อ node ได้ชัด เริ่มที่หน้า workspace
4. เปิดไฟล์ตัวอย่างในโฟลเดอร์นี้ไว้สำหรับ copy/paste ทางหลักใช้ pasted text จึงไม่ต้องเตรียม PDF
5. ซ้อม extraction → map → baseline → review → approval ให้ครบหนึ่งรอบบนโปรเจกต์ซ้อม ผล AI อาจต่างกัน ให้ใช้ผลจริงและปรับคำบรรยายให้ตรง
6. ใช้โปรเจกต์ใหม่อีกอันสำหรับ take จริง เพราะ baseline ยืนยันได้ครั้งเดียวและการอนุมัติเปลี่ยนขอบเขตที่ใช้เทียบครั้งต่อไป
7. พิจารณาโควตาก่อนซ้อม: extraction, map และแต่ละ change review ใช้ AI แยกกัน การอนุมัติไม่ต้องเรียก AI เพิ่ม ตรวจว่าไม่มี error และสถานะขึ้น `Saved online`

## ลำดับช็อตและบทบรรยายอังกฤษ

เวลาเป็นเป้าหมายการตัดต่อ ไม่ใช่เวลาประมวลผลที่รับประกัน ช่วง 00:20–02:52 เป็นการสาธิตจริงรวม 152 วินาที จากทั้งหมด 200 วินาที หากตัดช่วงรอ ให้ขึ้น `Processing wait shortened` สั้น ๆ

### 00:00–00:20 — ปัญหาและชื่อผลิตภัณฑ์

ภาพ: workspace จริงหรือแผนผังที่เตรียมไว้ ไม่มีสไลด์ยาว

> A client says, “Can you add just one more thing?” For a small team, that can become an entirely new system. TuyDui helps freelancers and project managers turn a brief into visible work, then compare new requests with the scope they have already approved.

### 00:20–00:55 — เปลี่ยนบรีฟเป็น requirements

ภาพ: `Requirements` → วางข้อความจาก `brief-v1.txt` ใน `Or paste your brief` → `Extract requirements` → อ่านข้อเสนอ → `Add for review`

> Here is a brief for a small studio website. I paste it into Requirements and ask TuyDui to extract the work. The AI proposes separate requirements, so I can check and edit them before adding them. These are suggestions for review; importing a brief does not approve the scope.

เว้นจังหวะให้กรรมการเห็นข้อความต้นฉบับและข้อเสนอที่สัมพันธ์กันอย่างน้อย 2 ข้อ

### 00:55–01:20 — แผนผังงาน

ภาพ: `Project Map` → `Build from requirements` → ดูภาพรวม → คลิกหนึ่ง node เพื่อเปิดรายละเอียด หาก dialog ยืนยัน baseline เปิดอัตโนมัติ ให้เลือก `Review first` เพื่อดู map ก่อน

> Next, I build the project map from those requirements. The branches make the work easier to inspect, and I can open a node to see its details. This gives the team a shared picture of the project before agreeing to take it on.

### 01:20–01:35 — ยืนยัน baseline

ภาพ: ตรวจรายการและ map → `Confirm baseline` → เห็น `Baseline V1 confirmed` / `Saved online`

หาก dialog ถูกปิดไปแล้ว เลือก node หลัก เปิดรายละเอียด และกด `Confirm original baseline` ใน inspector

> Once I have reviewed the work, I confirm the baseline. TuyDui keeps that original agreement and tracks the current approved scope separately. Later changes require another deliberate approval.

### 01:35–02:10 — คำขอเพิ่มทั้งระบบ

ภาพ: `Changes` → วาง `change-new-scope.txt` → `Compare with approved scope` → อ่าน classification, explanation และ client message ที่ได้จริง

> Now the client asks for a membership system: registration, login, saved projects, and an admin dashboard. I compare this request with the approved website scope. The AI explains why this is additional work and proposes the affected additions. For a major new system, it also drafts a client message explaining why the cost would increase, without inventing a price or a deadline.

หากผลจริงไม่ได้จัดเป็น major new system ให้ปรับบทให้ตรงผลและตรวจเหตุผลก่อนอัด ไม่สร้างผลวิเคราะห์ปลอมเพื่อให้ตรงบท

### 02:10–02:33 — มนุษย์ตัดสินใจและ map เปลี่ยน

ภาพ: หยุดให้เห็นปุ่ม `Cancel proposal` และ `Approve and update map` → อ่านผล → อนุมัติ → เปิด `Project Map` → โชว์ node ใหม่ที่ถูกทำเครื่องหมาย affected → `History` สั้น ๆ

> At this point, the map has not changed. I can cancel the proposal or approve it. When I approve, TuyDui updates the affected work and the current approved scope. The original baseline remains available, while the activity records that a change was applied.

พูดว่ามีประวัติการเปลี่ยนแปลงได้ แต่ไม่เรียกว่า immutable audit log ทั้งระบบ

### 02:33–02:52 — คำขอที่อยู่ในงานเดิม

ภาพ: `Changes` → วาง `change-in-scope.txt` → compare → เห็นผลไม่มี map edits → กลับ map ถ้ามีเวลา

> A request that is already covered should behave differently. I ask for the same responsive contact page from the original brief. TuyDui compares it with the approved scope and shows that no map update is needed. It should help identify meaningful changes, not treat every client message as extra work.

ถ้าผลจริงไม่ใช่ in-scope ให้ตรวจว่าบรีฟและ requirement ยังระบุ contact page แบบ responsive อยู่ อย่าพูดว่าได้ผล in-scope หากไม่ได้ผลนั้น

### 02:52–03:07 — AI และเทคโนโลยี

ภาพ: คงหน้าผลจริงไว้ พร้อมข้อความสั้น `Next.js · React · TypeScript · Supabase · Server-side AI`

> The app uses Next.js, React, TypeScript, and Supabase. A server-side language model extracts requirements, suggests the map, and reviews changes. The server validates structured responses, and the user decides what to approve.

ในคำอธิบาย Devpost ให้ระบุชื่อ provider/model/API ที่ deploy ใช้จริง โค้ดมี MaxPlusAI provider แต่ค่าเริ่มต้นใน README ไม่ใช่หลักฐานยืนยันชื่อโมเดลที่ production ใช้อยู่

### 03:07–03:20 — ประโยชน์และลิงก์

ภาพ: map หลังอนุมัติ พร้อมชื่อ TuyDui, URL แอปและ GitHub

> TuyDui helps small teams discuss extra work with a clear reference to the original agreement. The goal is fewer misunderstandings and more informed decisions before saying yes. You can try the prototype and inspect the source code at the links in our submission.

## ทางเลือก PDF ถ้าต้องการโชว์หลักฐานหน้าเอกสาร

หากมี PDF แบบเลือกข้อความได้ ให้ใช้ `Import a PDF brief` → `Read PDF brief` แทนการวางข้อความ แอปเส้นทางนี้เก็บ document version และ source page/quote และสร้าง map ต่อให้อัตโนมัติ ตรวจข้อเสนอจากผลจริงก่อน confirm baseline

เปลี่ยนบทช็อตแรกเป็น:

> I upload the client's PDF brief. TuyDui proposes requirements with source-page references and quotes, then builds a draft project map. I can trace a requirement back to the brief before confirming the baseline.

ไม่กล่าวอ้าง source-page evidence ใน take ที่ใช้ pasted text เพราะหน้าจอเส้นทางนั้นไม่ได้แสดง PDF page/quote และไม่ใช้ PDF สแกนที่ไม่มี text layer

## ก่อนส่ง Devpost

- คลิปสุดท้ายยาว 2–4 นาที อ่านตัวอักษรได้ ฟังเสียงได้ และใช้เวลาเป็นส่วนใหญ่กับแอปจริง
- ต้องมีการสาธิตผลก่อนและหลังอนุมัติ ไม่จบแค่หน้าล็อกอินหรือหน้า dashboard
- แนบ screenshot 3 ภาพ: requirements, map, change-review result
- ใส่ [GitHub](https://github.com/NoppakornZen/TuyDui) และ URL ที่เข้าถึงคลิปได้ ตรวจจากอีกเบราว์เซอร์หรือโหมดไม่ระบุตัวตน
- ระบุให้ชัดว่า hosted app ต้องล็อกอิน กรรมการควรเข้าใจ workflow จากคลิปได้โดยไม่ต้องรัน source เอง
- ระบุการใช้ AI ทั้งในผลิตภัณฑ์และระหว่างพัฒนา ตามเครื่องมือที่ใช้จริง
- บอกงานใหม่ช่วงการแข่งขันด้วยข้อเท็จจริง ตรวจพบ commits 3–4 ต.ค. เกี่ยวกับ multi-project, sharing และ profile แต่ต้องให้ผู้พัฒนายืนยันสิ่งที่ทำและผู้ร่วมทีมเอง
- README และ `MVP_BUILD_STATUS.md` ยังมีข้อความเก่าเรื่องไม่มีบัญชี/ไม่มี cloud storage ให้ปรับเอกสารให้ตรงเวอร์ชันที่จะส่งก่อนอ้างเป็นสถานะล่าสุด
- ไม่ใส่ accuracy, เปอร์เซ็นต์เวลาที่ประหยัด, ลูกค้าจริง หรือรายได้ หากไม่มีข้อมูลวัดรองรับ

## หลักฐานที่ตรวจในโฟลเดอร์นี้

ตรวจโค้ด workspace ปัจจุบัน, prompts, services และ migration 005 แล้ว เส้นทางที่วางบทสอดคล้องกับปุ่มใน `app/workspace/[projectId]/page.tsx`

`npm test`: ผ่าน 8/8 รวม persistence, permissions, baseline ที่เปลี่ยนไม่ได้, approved scope และ conflicts โดยใช้ฐานข้อมูลจำลอง PGlite และ AI mocks

`npm run check`: ผ่าน

ยังไม่ได้ตรวจการอัดหน้าจอหรือเรียก live AI ในเบราว์เซอร์ ผลทดสอบข้างต้นไม่ยืนยันว่า deployment และ AI provider ทำงานครบใน take จริง

HyperFrames usage probe: `status: unknown`, `reason: no_subscription_login` — ยังระบุโควตาเรนเดอร์ไม่ได้
