'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import './review-design.css';

type ReviewData = {
  projectName: string;
  clientName: string;
  status: 'pending' | 'approved' | 'needs_discussion';
  summary: string;
  rawRequest: string;
  explanation: string;
  priceThb: number | null;
  extraTimeText: string;
  newDeadline: string | null;
  clientNote: string;
  createdAt: string;
  decidedAt: string | null;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ReviewPage() {
  const params = useParams();
  const token = String(params.token ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [review, setReview] = useState<ReviewData | null>(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState<'approved' | 'needs_discussion' | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/review/${token}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({})) as { data?: ReviewData; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error || 'ไม่พบลิงก์นี้');
        if (!cancelled) setReview(payload.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [token]);

  async function decide(decision: 'approved' | 'needs_discussion') {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch(`/api/review/${token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision, clientNote: note.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { data?: { status: ReviewData['status']; decidedAt: string }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'บันทึกคำตอบไม่สำเร็จ');
      setReview((current) => current ? { ...current, status: payload.data!.status, decidedAt: payload.data!.decidedAt, clientNote: note.trim() } : current);
      setConfirming(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกคำตอบไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="review-app">
      <div className="review-card">
        {loading && <div className="review-loading" role="status"><div className="spinner" /><p>กำลังเปิดคำขอ...</p></div>}

        {!loading && error && !review && (
          <div className="review-error" role="alert">
            <h1>เปิดลิงก์ไม่ได้</h1>
            <p>{error}</p>
            <p className="review-error-hint">ลิงก์อาจพิมพ์ไม่ครบหรือถูกยกเลิกแล้ว กรุณาติดต่อผู้จัดการโปรเจกต์ของคุณ</p>
          </div>
        )}

        {!loading && review && (
          <>
            <header className="review-header">
              <span className="review-kicker">คำขอเปลี่ยนแปลงขอบเขตงาน</span>
              <h1>{review.projectName}</h1>
              <p>ส่งถึง {review.clientName} · {formatDate(review.createdAt)}</p>
            </header>

            <section className="review-section">
              <h2>สิ่งที่ขอเพิ่ม</h2>
              {review.summary && <p className="review-summary">{review.summary}</p>}
              <blockquote className="review-request">{review.rawRequest}</blockquote>
            </section>

            <section className="review-section">
              <h2>ทำไมจึงเป็นงานเพิ่ม</h2>
              <p className="review-explanation">{review.explanation}</p>
            </section>

            {(review.priceThb !== null || review.extraTimeText || review.newDeadline) && (
              <section className="review-terms">
                <h2>เงื่อนไขที่เปลี่ยนไป</h2>
                <div className="review-terms-grid">
                  {review.priceThb !== null && (
                    <div className="review-term"><small>ค่าใช้จ่ายเพิ่มเติม</small><strong>฿{formatPrice(review.priceThb)}</strong></div>
                  )}
                  {review.extraTimeText && (
                    <div className="review-term"><small>ระยะเวลาเพิ่มเติม</small><strong>{review.extraTimeText}</strong></div>
                  )}
                  {review.newDeadline && (
                    <div className="review-term"><small>กำหนดส่งงานใหม่</small><strong>{formatDate(review.newDeadline)}</strong></div>
                  )}
                </div>
              </section>
            )}

            {review.status === 'pending' ? (
              <section className="review-decision">
                <label htmlFor="review-note">หมายเหตุถึงทีมงาน (ไม่บังคับ)</label>
                <textarea id="review-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="เช่น ขอปรับรายละเอียดตรง..." />
                {error && <p className="review-inline-error" role="alert">{error}</p>}
                {confirming ? (
                  <div className="review-confirm">
                    <p>{confirming === 'approved'
                      ? 'ยืนยันอนุมัติงานเพิ่มนี้ตามเงื่อนไขด้านบน? การตัดสินใจจะถูกบันทึกและเปลี่ยนไม่ได้'
                      : 'ส่งคำขอคุยก่อนตัดสินใจ? ทีมงานจะติดต่อกลับ'}</p>
                    <div className="review-actions">
                      <button className="button-light" disabled={sending} onClick={() => setConfirming(null)}>ย้อนกลับ</button>
                      <button className="button-primary" disabled={sending} onClick={() => void decide(confirming)}>
                        {sending ? 'กำลังบันทึก...' : 'ยืนยัน'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="review-actions">
                    <button className="button-light" onClick={() => setConfirming('needs_discussion')}>ขอคุยก่อน</button>
                    <button className="button-primary" onClick={() => setConfirming('approved')}>อนุมัติงานเพิ่มนี้</button>
                  </div>
                )}
              </section>
            ) : (
              <section className={`review-result ${review.status}`} role="status">
                <h2>{review.status === 'approved' ? 'อนุมัติแล้ว' : 'ขอคุยก่อนตัดสินใจ'}</h2>
                <p>{review.decidedAt ? `บันทึกเมื่อ ${formatDate(review.decidedAt)}` : ''} การตัดสินใจนี้ถูกบันทึกพร้อมรายละเอียดทั้งหมด ณ เวลาที่ตอบ และเปลี่ยนแปลงไม่ได้</p>
                {review.clientNote && <blockquote className="review-request">{review.clientNote}</blockquote>}
              </section>
            )}

            <footer className="review-footer">สร้างโดย TuyDui — ระบบจัดการขอบเขตงานสำหรับฟรีแลนซ์และทีมเล็ก</footer>
          </>
        )}
      </div>
    </main>
  );
}
