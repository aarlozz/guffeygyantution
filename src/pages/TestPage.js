import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';

const TOTAL_TIME = 60 * 60; // 1 hour in seconds
const PER_PAGE = 10;

// ── Load questions from public/questions.csv ──
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
          options: {
            A: row.optionA,
            B: row.optionB,
            C: row.optionC,
            D: row.optionD,
          },
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

export default function TestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const student = location.state?.student;

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionIndex: 'A'|'B'|'C'|'D' }
  const [currentPage, setCurrentPage] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const submittedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  // Redirect if no student
  useEffect(() => {
    if (!student) navigate('/');
  }, [student, navigate]);

  // Load questions
  useEffect(() => {
    loadQuestions()
      .then((qs) => {
        setQuestions(qs);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load questions. Make sure questions.csv is in the public folder.');
        setLoading(false);
      });
  }, []);

  // Timer countdown
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [loading]);

  const calculateScore = useCallback(() => {
    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] && answers[i] === q.answer) score++;
    });
    return score;
  }, [questions, answers]);

  const submitAttempt = useCallback(async (finalAnswers) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    try {
      const score = (() => {
        let s = 0;
        questions.forEach((q, i) => {
          if (finalAnswers[i] && finalAnswers[i] === q.answer) s++;
        });
        return s;
      })();

      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const attemptNumber = (student.attempt_count || 0) + 1;
      const percentage = parseFloat(((score / questions.length) * 100).toFixed(2));

      // Insert attempt
      const { error: attemptErr } = await supabase.from('attempts').insert({
        student_id: student.id,
        attempt_number: attemptNumber,
        score,
        total_questions: questions.length,
        percentage,
        time_taken_seconds: timeTaken,
        answers: finalAnswers,
      });
      if (attemptErr) throw attemptErr;

      // Update attempt count
      const { error: updateErr } = await supabase
        .from('students')
        .update({ attempt_count: attemptNumber })
        .eq('id', student.id);
      if (updateErr) throw updateErr;

      navigate('/result', {
        state: {
          score,
          total: questions.length,
          percentage,
          timeTaken,
          attemptNumber,
          studentName: student.full_name,
          attemptsLeft: 2 - attemptNumber,
        },
      });
    } catch (e) {
      console.error(e);
      setError('Failed to submit. Please check your internet connection.');
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [student, questions, navigate]);

  const handleAutoSubmit = useCallback(() => {
    setAnswers((prev) => {
      submitAttempt(prev);
      return prev;
    });
  }, [submitAttempt]);

  const handleSelect = (questionIdx, option) => {
    setAnswers((prev) => ({ ...prev, [questionIdx]: option }));
  };

  const totalPages = Math.ceil(questions.length / PER_PAGE);
  const pageStart = currentPage * PER_PAGE;
  const pageQuestions = questions.slice(pageStart, pageStart + PER_PAGE);
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const timerClass =
    timeLeft <= 300 ? 'critical' :
    timeLeft <= 600 ? 'warning' : '';

  const timerFillPct = (timeLeft / TOTAL_TIME) * 100;

  if (!student) return null;

  if (loading) {
    return (
      <div className="page">
        <div className="logo">MCQ Test Portal</div>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading questions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="logo">MCQ Test Portal</div>
        <div className="card">
          <div className="msg msg-error">⚠ {error}</div>
          <button className="btn btn-outline" onClick={() => navigate('/')}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Timer bar */}
      <div className="timer-bar">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
            {student.full_name} · Attempt {(student.attempt_count || 0) + 1}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {answeredCount}/{questions.length} answered
          </div>
        </div>
        <div className={`timer-display ${timerClass}`}>⏱ {formatTime(timeLeft)}</div>
        <button
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
          onClick={() => setShowConfirm(true)}
          disabled={submitting}
        >
          Submit
        </button>
      </div>
      <div className="timer-progress">
        <div
          className={`timer-progress-fill ${timerClass}`}
          style={{ width: `${timerFillPct}%` }}
        />
      </div>

      {/* Questions */}
      <div style={{ flex: 1, padding: '28px 20px', maxWidth: 780, margin: '0 auto', width: '100%' }}>
        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18 }}>
            Questions {pageStart + 1}–{Math.min(pageStart + PER_PAGE, questions.length)}
          </h2>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Page {currentPage + 1} of {totalPages}
          </span>
        </div>

        {/* Progress */}
        <div className="progress-wrap">
          <div className="progress-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>

        {pageQuestions.map((q, localIdx) => {
          const globalIdx = pageStart + localIdx;
          return (
            <div key={globalIdx} className="question-block">
              <div className="question-num">Question {globalIdx + 1}</div>
              <div className="question-text">{q.question}</div>
              <div className="options-grid">
                {Object.entries(q.options).map(([letter, text]) => (
                  <button
                    key={letter}
                    className={`option-btn ${answers[globalIdx] === letter ? 'selected' : ''}`}
                    onClick={() => handleSelect(globalIdx, letter)}
                  >
                    <span className="option-letter">{letter}</span>
                    <span>{text}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Pagination dots */}
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => {
            const pageAnswered = Array.from({ length: PER_PAGE }, (_, j) => answers[i * PER_PAGE + j]).some(Boolean);
            return (
              <button
                key={i}
                className={`page-dot ${currentPage === i ? 'active' : ''} ${pageAnswered ? 'answered' : ''}`}
                onClick={() => { setCurrentPage(i); window.scrollTo(0, 0); }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
          <button
            className="btn btn-outline"
            onClick={() => { setCurrentPage((p) => Math.max(0, p - 1)); window.scrollTo(0, 0); }}
            disabled={currentPage === 0}
          >
            ← Previous
          </button>
          {currentPage < totalPages - 1 ? (
            <button
              className="btn btn-primary"
              style={{ width: 'auto' }}
              onClick={() => { setCurrentPage((p) => p + 1); window.scrollTo(0, 0); }}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ width: 'auto', background: 'var(--accent3)', color: '#000' }}
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
            >
              Submit Test ✓
            </button>
          )}
        </div>

        {unansweredCount > 0 && (
          <div className="unanswered-badge">
            ⚠ {unansweredCount} question{unansweredCount > 1 ? 's' : ''} unanswered
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: 20
        }}>
          <div className="card" style={{ maxWidth: 420 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', marginBottom: 12 }}>Submit Test?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              You have answered <strong style={{ color: 'var(--text)' }}>{answeredCount}</strong> out of <strong style={{ color: 'var(--text)' }}>{questions.length}</strong> questions.
              {unansweredCount > 0 && (
                <span style={{ color: 'var(--accent2)' }}> {unansweredCount} will be marked as unanswered.</span>
              )}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={submitting}
                onClick={() => submitAttempt(answers)}
              >
                {submitting ? 'Submitting…' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
