import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state;

  if (!result) {
    navigate('/');
    return null;
  }

  const { score, total, percentage, timeTaken, attemptNumber, studentName, attemptsLeft } = result;

  const grade =
    percentage >= 90 ? { label: 'Excellent!', color: '#43e97b' } :
    percentage >= 75 ? { label: 'Great Job!', color: '#6c63ff' } :
    percentage >= 60 ? { label: 'Good Work', color: '#f9ca24' } :
    percentage >= 40 ? { label: 'Keep Trying', color: '#f0932b' } :
    { label: 'Need More Practice', color: '#ff6584' };

  return (
    <div className="page">
      <div className="logo">MCQ Test Portal</div>

      <div className="card" style={{ maxWidth: 500, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: 14 }}>
          Attempt {attemptNumber} · {studentName}
        </p>

        <div className="score-circle" style={{ borderColor: grade.color, boxShadow: `0 0 40px ${grade.color}33` }}>
          <div className="score-num" style={{ color: grade.color }}>{score}</div>
          <div className="score-label">out of {total}</div>
        </div>

        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, marginBottom: 8, color: grade.color }}>
          {grade.label}
        </h2>
        <p style={{ fontSize: 32, fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 4 }}>
          {percentage}%
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
          Completed in {formatTime(timeTaken)}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Correct', value: score, color: '#43e97b' },
            { label: 'Wrong / Skipped', value: total - score, color: '#ff6584' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '14px 12px',
            }}>
              <div style={{ fontSize: 24, fontFamily: 'Syne, sans-serif', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {attemptsLeft > 0 ? (
          <div className="msg msg-info" style={{ marginBottom: 20, textAlign: 'left' }}>
            ℹ You have <strong>{attemptsLeft}</strong> attempt{attemptsLeft > 1 ? 's' : ''} remaining.
          </div>
        ) : (
          <div className="msg msg-error" style={{ marginBottom: 20, textAlign: 'left' }}>
            ✗ You have used all your attempts.
          </div>
        )}

        
      </div>
    </div>
  );
}
