import Brand from './components/Brand';
import './landing-design.css';

// TODO before launch: replace with the real sales contact you check daily.
const CONTACT_LINE = '@tuydui';

export default function HomePage() {
  return (
    <main className="landing">
      <header className="landing-topbar">
        <Brand href="/" beta={false} />
        <nav className="landing-nav">
          <a href="#how">วิธีทำงาน</a>
          <a href="#pricing">ราคา</a>
          <a className="button-primary" href="/login">เริ่มใช้ฟรี</a>
        </nav>
      </header>

      <section className="landing-hero">
        <span className="landing-kicker">สำหรับฟรีแลนซ์ เอเจนซี และทีมเล็ก</span>
        <h1>ลูกค้าของงานเพิ่ม<br />คุณเห็นผลกระทบก่อนตอบตกลง</h1>
        <p className="landing-sub">
          TuyDui แปลงบรีฟให้เป็นแผนผังงาน ล็อกขอบเขตที่ตกลงไว้
          และเทียบทุกคำขอใหม่กับของเดิม — พร้อมหน้าอนุมัติให้ลูกค้ากดยืนยันงานเพิ่มพร้อมราคา
          โดยไม่ต้องสมัครบัญชี
        </p>
        <div className="landing-cta">
          <a className="button-primary" href="/login">เริ่มใช้ฟรี — ไม่ต้องใช้บัตร</a>
          <a className="button-light" href="#how">ดูวิธีทำงาน</a>
        </div>
      </section>

      <section className="landing-problem">
        <h2>ปัญหาที่คุ้นเคย</h2>
        <div className="landing-problem-grid">
          <div className="landing-problem-card"><strong>“ขอเพิ่มนิดเดียว”</strong><p>คำขอเล็ก ๆ สะสมจนงานบาน แต่ไม่มีหลักฐานชัด ๆ ว่าอะไรอยู่ในขอบเขตที่ตกลงกันไว้</p></div>
          <div className="landing-problem-card"><strong>คิดเงินเพิ่มไม่ถูก</strong><p>รู้ว่างานเพิ่ม แต่ไม่กล้าคิดเงิน เพราะอธิบายให้ลูกค้าเห็นภาพไม่ได้ว่าทำไมต้องจ่ายเพิ่ม</p></div>
          <div className="landing-problem-card"><strong>ปากเปล่า พิสูจน์ไม่ได้</strong><p>ลูกค้าบอกว่าไม่เคยตกลงเรื่องราคา คุณไม่มีบันทึกการอนุมัติที่ย้อนดูได้</p></div>
        </div>
      </section>

      <section className="landing-how" id="how">
        <h2>ทำงานยังไง</h2>
        <ol className="landing-steps">
          <li><em>1</em><div><strong>วางบรีฟลงไป</strong><p>แปะข้อความหรืออัปโหลด PDF ของลูกค้า AI แยกข้อกำหนดพร้อมอ้างอิงต้นฉบับ — คุณตรวจและแก้ก่อนเสมอ</p></div></li>
          <li><em>2</em><div><strong>เห็นงานเป็นแผนผัง</strong><p>ข้อกำหนดกลายเป็นแผนผังงานที่ทั้งทีมและลูกค้าอ่านรู้เรื่อง แล้วยืนยัน Baseline ที่แก้ย้อนหลังไม่ได้</p></div></li>
          <li><em>3</em><div><strong>คำขอใหม่เทียบของเดิม</strong><p>ลูกค้าขออะไรเพิ่ม ระบบเทียบกับขอบเขตที่อนุมัติแล้ว บอกว่าอยู่ในงานเดิมหรือเป็นงานเพิ่ม พร้อมเหตุผล</p></div></li>
          <li><em>4</em><div><strong>ส่งลิงก์ให้ลูกค้าอนุมัติ</strong><p>ใส่ราคาและเวลาที่คิดเพิ่ม ส่งลิงก์ให้ลูกค้า ลูกค้ากดอนุมัติโดยไม่ต้องสมัครบัญชี การตัดสินใจถูกบันทึก เปลี่ยนย้อนหลังไม่ได้</p></div></li>
        </ol>
      </section>

      <section className="landing-pricing" id="pricing">
        <h2>ราคา</h2>
        <div className="landing-plans">
          <div className="landing-plan">
            <h3>ฟรี</h3>
            <p className="landing-price">฿0</p>
            <ul>
              <li>โปรเจกต์ไม่จำกัด</li>
              <li>AI 10 ครั้ง/วัน</li>
              <li>ยืนยัน Baseline และเทียบคำขอใหม่</li>
              <li>ลิงก์อนุมัติสำหรับลูกค้า</li>
            </ul>
            <a className="button-light" href="/login">เริ่มใช้ฟรี</a>
          </div>
          <div className="landing-plan featured">
            <span className="landing-founding">ราคาสมาชิกกลุ่มแรก</span>
            <h3>Pro</h3>
            <p className="landing-price">฿149<small>/เดือน</small></p>
            <ul>
              <li>AI 100 ครั้ง/วัน</li>
              <li>ทุกฟีเจอร์ของแพ็กเกจฟรี</li>
              <li>ล็อกราคานี้ตลอดชีพ สำหรับผู้ใช้ 20 คนแรก</li>
              <li>คุยกับผู้พัฒนาโดยตรง ขอฟีเจอร์ได้</li>
            </ul>
            <a className="button-primary" href="/login">สมัครก่อน ค่อยจ่าย</a>
            <p className="landing-plan-note">ชำระผ่าน PromptPay แล้วส่งสลิปทาง LINE {CONTACT_LINE} — เปิด Pro ให้ภายใน 24 ชม. ไม่พอใจใน 7 วันแรก คืนเงินเต็มจำนวน</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>TuyDui — เห็นงานเพิ่มก่อนรับปากลูกค้า</p>
        <a href="/login">เข้าสู่ระบบ</a>
      </footer>
    </main>
  );
}
