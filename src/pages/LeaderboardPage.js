import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('leaderboard')
      .select('*')
      .then(({ data, error: err }) => {
        if (err) { setError('Failed to load leaderboard.'); }
        else { setLeaders(data || []); }
        setLoading(false);
      });
  }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const rankClasses = ['rank-1', 'rank-2', 'rank-3'];

  return (
    <div className="page">
      <div className="logo">MCQ Test Portal</div>

      <div className="card card-wide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 className="page-title">Top 3 Students</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Based on best score across all attempts</p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/')}>← Back</button>
        </div>

        {loading && <div className="spinner" />}
        {error && <div className="msg msg-error">⚠ {error}</div>}

        {!loading && !error && leaders.length === 0 && (
          <div className="msg msg-info">No results yet. Be the first to take the test!</div>
        )}

        {!loading && leaders.length > 0 && (
          <>
            {/* Podium cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
              {leaders.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--surface2)',
                  border: `1px solid ${i === 0 ? 'rgba(255,215,0,0.4)' : i === 1 ? 'rgba(192,192,192,0.3)' : 'rgba(205,127,50,0.3)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '24px 20px',
                  textAlign: 'center',
                  position: 'relative',
                }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>{medals[i]}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
                    {s.full_name}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
                    {s.college_name}
                  </div>
                  <div style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: 36,
                    fontWeight: 800,
                    color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'
                  }}>
                    {s.best_score}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {parseFloat(s.best_percentage).toFixed(1)}%
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', background: 'var(--border)', borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>
                    {s.interested_subject}
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>College</th>
                  <th>Subject</th>
                  <th>Best Score</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((s, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`rank-badge ${rankClasses[i]}`}>{i + 1}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.college_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.interested_subject}</td>
                    <td style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--accent)' }}>{s.best_score}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{parseFloat(s.best_percentage).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <hr className="divider" />
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Take the Test
        </button>
      </div>
    </div>
  );
}
