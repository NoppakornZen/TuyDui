# สคริปต์เดโมเดียวสำหรับ ImpactHack 2026 + ML Empowerment Build Challenge 3.0

สคริปต์นี้ใช้คลิปเดียวกันได้ทั้งสองรายการ เป้าหมายประมาณ **3 นาที**: อยู่ในข้อกำหนดคลิป 2–4 นาทีของ ImpactHack และอยู่ในรูปแบบไฟล์วิดีโอที่ใช้แสดงการทำงานได้ตามข้อกำหนดของ ML Empowerment

## แนวการถ่าย

- บรรยายภาษาไทยได้ และใส่คำบรรยายภาษาอังกฤษตามสคริปต์แปลด้านล่าง; กติกาที่ตรวจไม่ได้ระบุว่าต้องพูดภาษาใด
- ถ่ายผลิตภัณฑ์จริงเป็นหลัก เลี่ยงสไลด์เปิดยาว ให้ชื่อแอปอยู่ไม่เกิน 3–4 วินาที
- ใช้โปรเจกต์ตัวอย่างใหม่ ไม่แสดงชื่อหรือข้อมูลลูกค้าจริง
- อัดขั้นตอน `Extract requirements` → `Build from requirements` → `Confirm baseline` → `Compare with approved scope` → `Approve and update map`
- รอผลตามจริง ตัดเฉพาะช่วงรอที่ยาวเกิน และอย่าตัดจังหวะที่แสดงคำตอบของ AI หรือการตัดสินใจของผู้ใช้
- ซ้อมหนึ่งรอบก่อนอัดจริง เพราะการอ่านบรีฟ สร้าง map และวิเคราะห์คำขอเป็นคำขอ AI คนละงาน เวลาตอบอาจต่างกัน

## บทและภาพตามเวลา

เวลาเป็นกรอบสำหรับตัดต่อ เวลาจริงขึ้นกับความเร็วที่อ่านและตอบของ AI

### 00:00–00:18 — ปัญหา

ภาพ: เปิดหน้าโปรเจกต์ TuyDui หรือหน้า workspace จริง เห็นชื่อโปรเจกต์และแผนผังสั้น ๆ

**บรรยายไทย**

> เวลาลูกค้าขอเพิ่มงานเล็ก ๆ ทีมอาจมองไม่เห็นว่าสิ่งนั้นเปลี่ยนขอบเขตไปแค่ไหน TuyDui ช่วยแปลงบรีฟให้เห็นเป็นงาน แล้วเทียบคำขอใหม่กับขอบเขตที่อนุมัติแล้ว

**คำบรรยายอังกฤษ**

> When a client asks for one more small change, a team may not see how much the scope has shifted. TuyDui turns a brief into visible work and compares new requests with the scope already approved.

### 00:18–00:52 — ใช้ AI อ่านบรีฟ

ภาพ: เปิด Requirements → วางข้อความจาก `brief-v1.txt` ใน `Or paste your brief` → กด `Extract requirements` → หยุดให้เห็นข้อเสนอจริงสองสามข้อ → กด `Add for review`

**บรรยายไทย**

> นี่คือบรีฟเว็บไซต์ของสตูดิโอเล็ก ๆ ผมวางข้อความ แล้วให้ AI แยกข้อกำหนดที่ระบุไว้เป็นข้อเสนอ ผมตรวจและแก้ไขได้ก่อนเพิ่มเข้ารายการ งานยังไม่ถูกอนุมัติเพียงเพราะ AI สร้างข้อเสนอขึ้นมา

**คำบรรยายอังกฤษ**

> Here is a brief for a small studio website. I paste it in, and AI separates the stated requirements into proposals. I can review and edit them before adding them. An AI suggestion does not approve any work.

### 00:52–01:17 — เห็นงานเป็นแผนผัง

ภาพ: เปิด `Project Map` → กด `Build from requirements` → ขยับดูแผนผังและคลิก node หนึ่งอันเพื่อเปิดรายละเอียด

**บรรยายไทย**

> จากนั้น AI จัดข้อกำหนดเป็นแผนผังงาน ผมดูภาพรวมและเปิดแต่ละส่วนเพื่ออ่านรายละเอียดได้ ทีมจึงเห็นว่างานเชื่อมโยงกันอย่างไร ก่อนตกลงรับผิดชอบงานนี้

**คำบรรยายอังกฤษ**

> Next, AI organizes the requirements into a project map. I can see the overall plan and open each area for details, so the team can understand how the work fits together before agreeing to it.

### 01:17–01:31 — ยืนยันขอบเขต

ภาพ: ตรวจ requirements กับ map → กด `Confirm baseline` ใน dialog หรือ `Confirm original baseline` ในรายละเอียดโปรเจกต์ → แสดง `Baseline V1 confirmed` และ `Saved online`

**บรรยายไทย**

> หลังตรวจงานแล้ว ผมยืนยัน baseline เพื่อบันทึกขอบเขตตั้งต้น แผนผังที่ AI สร้างยังเป็นข้อเสนอจนกว่าผู้ใช้จะตรวจและยืนยัน

**คำบรรยายอังกฤษ**

> After reviewing the work, I confirm the baseline. The AI-generated map remains a proposal until a person reviews and confirms it.

### 01:31–02:08 — เทียบคำขอใหม่กับของเดิม

ภาพ: เปิด Changes → วาง `change-new-scope.txt` → กด `Compare with approved scope` → รอและแสดงผลจริง อ่านประเภทการเปลี่ยนแปลง คำอธิบาย และ client message หากมี

**บรรยายไทย**

> ต่อมาลูกค้าขอระบบสมาชิก มีสมัครเข้าใช้ บันทึกผลงานส่วนตัว และ dashboard สำหรับทีม ผมส่งคำขอนี้ไปเทียบกับขอบเขตที่อนุมัติ AI ระบุเหตุผลและเสนอเฉพาะส่วนงานที่ได้รับผล หากระบบจัดว่าเป็นระบบใหม่ขนาดใหญ่ AI อาจร่างข้อความอธิบายให้ลูกค้าเห็นว่ามีค่าใช้จ่ายเพิ่ม โดยไม่แต่งราคา ชั่วโมง หรือกำหนดส่งขึ้นมาเอง

**คำบรรยายอังกฤษ**

> Now the client asks for memberships, private saved projects, and a staff dashboard. I compare that request with the approved scope. AI explains its reasoning and proposes the affected work. If it identifies a major new system, it can draft a client message explaining why costs would increase without inventing a price, hours, or a deadline.

บทนี้กล่าวถึง client message เฉพาะเมื่อผลจริงแสดงข้อความนั้น หากไม่แสดง ให้ใช้ประโยคสั้นแทน: “AI explains its reasoning and proposes affected work; it does not decide a price or approve the change.”

### 02:08–02:33 — ให้คนตัดสินใจ

ภาพ: เห็นปุ่ม `Cancel proposal` และ `Approve and update map` → กด `Approve and update map` → เปิด Project Map → ชี้ node ใหม่หรือ node ที่แสดง `Affected by a new request` → โชว์สถานะ `Saved online`

**บรรยายไทย**

> ก่อนกดอนุมัติ แผนผังยังไม่เปลี่ยน ผมเลือกได้ว่าจะยกเลิกหรืออนุมัติข้อเสนอ เมื่ออนุมัติ ระบบเพิ่มงานในขอบเขตปัจจุบัน ส่วน baseline แรกยังเก็บไว้อ้างอิง นี่ช่วยให้ทีมคุยเรื่องผลของงานเพิ่มก่อนรับปาก

**คำบรรยายอังกฤษ**

> Before approval, the map stays unchanged. I can cancel or approve the proposal. Once approved, the current scope updates while the original baseline stays available for reference. That gives the team a clearer basis for discussing extra work before saying yes.

### 02:33–02:52 — วิธีใช้ AI และคุณค่าของงาน

ภาพ: กลับมาที่ผลวิเคราะห์หรือแผนผังจริง ขึ้นบรรทัดเทคโนโลยีสั้น ๆ: `Next.js · TypeScript · Supabase · Server-side AI API`

**บรรยายไทย**

> TuyDui ใช้ AI กับงานภาษาที่มีประโยชน์จริง ตั้งแต่แยกข้อกำหนด จัดแผนผัง ไปจนถึงอธิบายคำขอใหม่ ฝั่งเซิร์ฟเวอร์ตรวจรูปแบบผลลัพธ์ และผู้ใช้เป็นคนเลือกว่าจะอนุมัติหรือไม่ เป้าหมายคือช่วยทีมเล็กเห็นขอบเขตงานชัดขึ้นและสื่อสารก่อนเกิดความเข้าใจไม่ตรงกัน

**คำบรรยายอังกฤษ**

> TuyDui uses AI for practical language tasks: extracting requirements, organizing the map, and explaining new requests. The server validates the response, and the user decides whether to approve. The goal is to help small teams see scope more clearly and communicate before misunderstandings grow.

### 02:52–03:00 — ปิดคลิป

ภาพ: ชื่อ TuyDui, GitHub, ลิงก์ live demo; ถ้าจะระบุผลงานที่เพิ่มระหว่างการแข่งขัน ให้ขึ้นท้ายสั้น ๆ ว่า `Challenge updates: multi-project workspaces · team sharing · profiles` เฉพาะส่วนที่ผู้ส่งยืนยันว่าเป็นผลงานจริงของตนหรือทีม

**บรรยายไทย**

> นี่คือ TuyDui พื้นที่ช่วยจัดการขอบเขตงานให้ชัดก่อนทีมตอบตกลง

**คำบรรยายอังกฤษ**

> This is TuyDui, a workspace for making project scope clearer before a team says yes.

## ข้อความตัวอย่างที่ใช้ในเดโม

- บรีฟตั้งต้น: [`brief-v1.txt`](brief-v1.txt)
- คำขอเพิ่มระบบสมาชิก: [`change-new-scope.txt`](change-new-scope.txt)

สคริปต์นี้ไม่อ้างว่าระบบวัดความแม่นยำหรือประหยัดเวลาเป็นเปอร์เซ็นต์ ไม่กล่าวว่า AI อนุมัติงานแทนผู้ใช้ และไม่แสดงข้อมูลลูกค้าจริง

ก่อนกรอกชื่อโมเดลหรือ AI API ในท้ายคลิปและหน้า Devpost ให้ยืนยันค่าที่ตั้งอยู่ใน deployment จริงก่อน ชื่อ `claude-opus-5` ใน README เพียงอย่างเดียวไม่ยืนยันว่าเป็นโมเดลที่ production ใช้อยู่
