import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SUBJECTS = [
  'Medicine (MBBS)',
  'Engineering (BE/B.Tech)',
  'Management (BBA/MBA)',
  'Science (BSc)',
  'Law (LLB)',
  'Nursing',
  'Pharmacy',
  'Agriculture',
  'Education (B.Ed)',
  'Information Technology',
  'Other',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    college_name: '',
    phone_number: '',
    email: '',
    interested_subject: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const validate = () => {
    if (!form.full_name.trim()) return 'Full name is required.';
    if (!form.college_name.trim()) return 'College name is required.';
    if (!/^\d{10}$/.test(form.phone_number.trim())) return 'Enter a valid 10-digit phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.';
    if (!form.interested_subject) return 'Please select your interested subject.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      // Check if student already exists by email or phone
      const { data: existing, error: fetchErr } = await supabase
        .from('students')
        .select('id, full_name, attempt_count, email, phone_number')
        .or(`email.eq.${form.email.trim().toLowerCase()},phone_number.eq.${form.phone_number.trim()}`)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (existing) {
        // Returning student
        if (existing.attempt_count >= 2) {
          setError('You have already used both your attempts. No more attempts are allowed.');
          setLoading(false);
          return;
        }
        // Let them take next attempt
        navigate('/test', { state: { student: existing } });
        return;
      }

      // New student — insert
      const { data: newStudent, error: insertErr } = await supabase
        .from('students')
        .insert({
          full_name: form.full_name.trim(),
          college_name: form.college_name.trim(),
          phone_number: form.phone_number.trim(),
          email: form.email.trim().toLowerCase(),
          interested_subject: form.interested_subject,
          attempt_count: 0,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      navigate('/test', { state: { student: newStudent } });
    } catch (e) {
      console.error(e);
      if (e.code === '23505') {
        setError('A student with this email or phone already exists. Please use your registered details.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="logo">MCQ Test Portal</div>

      <div className="card">
        <h1 className="page-title">Register & Begin</h1>
        <p className="page-subtitle">Fill in your details to start the test. You have 2 attempts.</p>

        {error && (
          <div className="msg msg-error">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="form-group">
          <label>Full Name</label>
          <input
            name="full_name"
            type="text"
            placeholder="e.g. Ram Bahadur Thapa"
            value={form.full_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>+2 College Name</label>
          <input
            name="college_name"
            type="text"
            placeholder="e.g. Tribhuvan Multiple Campus"
            value={form.college_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Phone Number</label>
          <input
            name="phone_number"
            type="tel"
            placeholder="10-digit mobile number"
            value={form.phone_number}
            onChange={handleChange}
            maxLength={10}
          />
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input
            name="email"
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Interested Further Study Subject</label>
          <select
            name="interested_subject"
            value={form.interested_subject}
            onChange={handleChange}
          >
            <option value="">— Select subject —</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <hr className="divider" />

        <div className="msg msg-info">
          <span>ℹ</span>
          <span>Test has <strong>100 questions</strong> · Time limit: <strong>1 hour</strong> · Max <strong>2 attempts</strong></span>
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait…' : 'Start Test →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/leaderboard" className="btn btn-outline"></a>
        </div>
      </div>
    </div>
  );
}
