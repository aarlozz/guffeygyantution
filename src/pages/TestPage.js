import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';

const TOTAL_TIME = 60 * 60;
const PER_PAGE = 10;

async function loadQuestions() {
  const res = await fetch('/questions.csv');
  const text = await res.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const qs = result.data.map((row, i) => ({
          sn: row.sn || i + 1,
          question: row.question,
          options: { A: row.optionA, B: row.optionB, C: row.optionC, D: row.optionD },
          answer: row.answer?.trim().toUpperCase(),
        }));
        resolve(qs);
      },
      error: reject,
    });
  });
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const styles = {
  wrap: { maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'sans-serif' },
  warningBar: {
    background: '#FEE2E2', color: '#B91C1C', padding: '10px 16px',
    borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16,
    border: '1px solid #FECACA',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #E5E7EB',
  },
  timer: (warn) => ({
    fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
    color: warn ? '#DC2626' : '#111827',
  }),
  violationBadge: {
    fontSize: 12, padding: '4px 10px', borderRadius: 6,
    background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A',
  },
  progressRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  progressTrack: { flex: 1, height: 4, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: (pct) => ({
    height: '100%', width: `${pct}%`, background: '#2563EB',
    borderRadius: 4, transition: 'width 0.3s',
  }),
  progressLabel: { fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' },
  qCard: {
    background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
    padding: '1.25rem 1.5rem', marginBottom: '1rem',
  },
  qHeader: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: '1rem' },
  qNum: (answered) => ({
    minWidth: 28, height: 28, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500,
    flexShrink: 0, marginTop: 2,
    background: answered ? '#DBEAFE' : '#F3F4F6',
    color: answered ? '#1D4ED8' : '#6B7280',
  }),
  qText: { fontSize: 15, color: '#111827', lineHeight: 1.65 },
  optGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  opt: (selected) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
    border: selected ? '1.5px solid #2563EB' : '1px solid #D1D5DB',
    background: selected ? '#EFF6FF' : '#fff',
    transition: 'all 0.15s',
  }),
  optKey: (selected) => ({
    width: 26, height: 26, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500,
    flexShrink: 0,
    background: selected ? '#2563EB' : 'transparent',
    border: selected ? '1.5px solid #2563EB' : '1.5px solid #D1D5DB',
    color: selected ? '#fff' : '#6B7280',
  }),
  optText: { fontSize: 14, color: '#111827', lineHeight: 1.4 },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, paddingTop: 16, borderTop: '1px solid #E5E7EB',
  },
  btn: {
    padding: '8px 20px', border: '1px solid #D1D5DB', borderRadius: 8,
    background: '#fff', fontSize: 14, cursor: 'pointer', color: '#374151',
  },
  btnSubmit: {
    padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
    cursor: 'pointer', background: '#2563EB', color: '#fff', border: 'none',
  },
  confirmOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
  },
  confirmBox: {
    background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 360, width: '90%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
  },
  confirmTitle: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
  confirmText: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 1.5 },
  confirmBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
};

export default function TestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const student = location.state?.student;

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState('');

  const submittedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => { if (!student) navigate('/'); }, [student, navigate]);

  useEffect(() => {
    loadQuestions().then((qs) => { setQuestions(qs); setLoading(false); })
      .catch(() => { setError('Failed to load questions.'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); handleAutoSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  const submitAttempt = useCallback(async (finalAnswers) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      let score = 0;
      questions.forEach((q, i) => { if (finalAnswers[i] === q.answer) score++; });
      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const attemptNumber = (student.attempt_count || 0) + 1;
      const percentage = parseFloat(((score / questions.length) * 100).toFixed(2));
      await supabase.from('attempts').insert({
        student_id: student.id, attempt_number: attemptNumber, score,
        total_questions: questions.length, percentage, time_taken_seconds: timeTaken,
        answers: finalAnswers, violations,
      });
      await supabase.from('students').update({ attempt_count: attemptNumber }).eq('id', student.id);
      navigate('/result', { state: { score, total: questions.length, percentage, timeTaken, attemptNumber, violations } });
    } catch (e) {
      setError('Submission failed.');
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [student, questions, navigate, violations]);

  const handleAutoSubmit = useCallback(() => {
    setAnswers((prev) => { submitAttempt(prev); return prev; });
  }, [submitAttempt]);

  useEffect(() => {
    if (loading) return;
    let count = 0;
    const handleViolation = () => {
      count++;
      setViolations(count);
      setWarning(`Do not leave the test! (${count}/3)`);
      setTimeout(() => setWarning(''), 3000);
      if (count >= 3) { alert('Test auto-submitted due to cheating!'); handleAutoSubmit(); }
    };
    const onVisibility = () => { if (document.hidden) handleViolation(); };
    const onBlur = () => handleViolation();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [loading, handleAutoSubmit]);

  useEffect(() => {
    document.documentElement.requestFullscreen?.();
    const exitHandler = () => { if (!document.fullscreenElement) alert('Do not exit fullscreen!'); };
    document.addEventListener('fullscreenchange', exitHandler);
    return () => document.removeEventListener('fullscreenchange', exitHandler);
  }, []);

  const handleSelect = (idx, opt) => setAnswers((prev) => ({ ...prev, [idx]: opt }));

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading questions…</div>;
  if (error) return <div style={{ padding: '2rem', color: '#DC2626' }}>{error}</div>;

  const pageStart = currentPage * PER_PAGE;
  const pageEnd = pageStart + PER_PAGE;
  const pageQuestions = questions.slice(pageStart, pageEnd);
  const totalPages = Math.ceil(questions.length / PER_PAGE);
  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / questions.length) * 100);
  const unanswered = questions.length - answeredCount;

  return (
    <div style={styles.wrap}>
      {warning && <div style={styles.warningBar}>⚠ {warning}</div>}

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.timer(timeLeft < 300)}>{formatTime(timeLeft)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {violations > 0 && (
            <span style={styles.violationBadge}>Violations: {violations}/3</span>
          )}
          <button style={styles.btnSubmit} onClick={() => setShowConfirm(true)} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit test'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressRow}>
        <div style={styles.progressTrack}>
          <div style={styles.progressFill(progressPct)} />
        </div>
        <span style={styles.progressLabel}>{answeredCount} of {questions.length} answered</span>
      </div>

      {/* Questions */}
      {pageQuestions.map((q, i) => {
        const idx = pageStart + i;
        const selected = answers[idx];
        return (
          <div key={idx} style={styles.qCard}>
            <div style={styles.qHeader}>
              <div style={styles.qNum(!!selected)}>{idx + 1}</div>
              <p style={styles.qText}>{q.question}</p>
            </div>
            <div style={styles.optGrid}>
              {Object.entries(q.options).map(([k, v]) => (
                <button
                  key={k}
                  style={styles.opt(selected === k)}
                  onClick={() => handleSelect(idx, k)}
                >
                  <span style={styles.optKey(selected === k)}>{k}</span>
                  <span style={styles.optText}>{v}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      <div style={styles.pagination}>
        <button
          style={styles.btn}
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          ← Previous
        </button>
        <span style={{ fontSize: 13, color: '#6B7280' }}>
          Page {currentPage + 1} of {totalPages}
        </span>
        <button
          style={styles.btn}
          onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={currentPage === totalPages - 1}
        >
          Next →
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={styles.confirmOverlay}>
          <div style={styles.confirmBox}>
            <p style={styles.confirmTitle}>Submit your test?</p>
            <p style={styles.confirmText}>
              {unanswered > 0
                ? `You have ${unanswered} unanswered question(s). You cannot change your answers after submitting.`
                : 'All questions answered. Ready to submit?'}
            </p>
            <div style={styles.confirmBtns}>
              <button style={styles.btn} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button style={styles.btnSubmit} onClick={() => { setShowConfirm(false); submitAttempt(answers); }}>
                Yes, submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}