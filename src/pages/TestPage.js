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
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // ✅ Anti-cheat states
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState('');

  const submittedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!student) navigate('/');
  }, [student, navigate]);

  useEffect(() => {
    loadQuestions()
      .then((qs) => {
        setQuestions(qs);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load questions.');
        setLoading(false);
      });
  }, []);

  // ⏱ Timer
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
  }, [loading]);

  const submitAttempt = useCallback(async (finalAnswers) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    try {
      let score = 0;
      questions.forEach((q, i) => {
        if (finalAnswers[i] && finalAnswers[i] === q.answer) score++;
      });

      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const attemptNumber = (student.attempt_count || 0) + 1;
      const percentage = parseFloat(((score / questions.length) * 100).toFixed(2));

      await supabase.from('attempts').insert({
        student_id: student.id,
        attempt_number: attemptNumber,
        score,
        total_questions: questions.length,
        percentage,
        time_taken_seconds: timeTaken,
        answers: finalAnswers,
        violations: violations, // ✅ store cheating
      });

      await supabase
        .from('students')
        .update({ attempt_count: attemptNumber })
        .eq('id', student.id);

      navigate('/result', {
        state: {
          score,
          total: questions.length,
          percentage,
          timeTaken,
          attemptNumber,
          violations,
        },
      });
    } catch (e) {
      setError('Submission failed.');
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [student, questions, navigate, violations]);

  const handleAutoSubmit = useCallback(() => {
    setAnswers((prev) => {
      submitAttempt(prev);
      return prev;
    });
  }, [submitAttempt]);

  // 🚨 Anti-tab switching logic
  useEffect(() => {
    if (loading) return;

    let count = 0;

    const handleViolation = () => {
      count++;
      setViolations(count);
      setWarning(`⚠ Do not leave test! (${count}/3)`);

      setTimeout(() => setWarning(''), 3000);

      if (count >= 3) {
        alert('Test auto-submitted due to cheating!');
        handleAutoSubmit();
      }
    };

    const onVisibility = () => {
      if (document.hidden) handleViolation();
    };

    const onBlur = () => handleViolation();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [loading, handleAutoSubmit]);

  // 🖥 Fullscreen enforcement
  useEffect(() => {
    document.documentElement.requestFullscreen?.();

    const exitHandler = () => {
      if (!document.fullscreenElement) {
        alert('Do not exit fullscreen!');
      }
    };

    document.addEventListener('fullscreenchange', exitHandler);

    return () => {
      document.removeEventListener('fullscreenchange', exitHandler);
    };
  }, []);

  const handleSelect = (idx, opt) => {
    setAnswers((prev) => ({ ...prev, [idx]: opt }));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  const pageStart = currentPage * PER_PAGE;
  const pageQuestions = questions.slice(pageStart, pageStart + PER_PAGE);

  return (
    <div>
      {/* 🚨 Warning banner */}
      {warning && (
        <div style={{ background: 'red', color: '#fff', padding: 10, textAlign: 'center' }}>
          {warning}
        </div>
      )}

      <h2>⏱ {formatTime(timeLeft)}</h2>
      <p>Violations: {violations}/3</p>

      {pageQuestions.map((q, i) => {
        const idx = pageStart + i;
        return (
          <div key={idx}>
            <p>{q.question}</p>
            {Object.entries(q.options).map(([k, v]) => (
              <button key={k} onClick={() => handleSelect(idx, k)}>
                {k}: {v}
              </button>
            ))}
          </div>
        );
      })}

      <button onClick={() => setShowConfirm(true)}>Submit</button>

      {showConfirm && (
        <div>
          <p>Submit test?</p>
          <button onClick={() => submitAttempt(answers)}>Yes</button>
          <button onClick={() => setShowConfirm(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}