import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const SUBJECTS = [
  "BSc CSIT (Computer Science & IT)",
  "BCA (Computer Applications)",
  "BIT (Information Technology)",
  "Engineering (Civil/Computer/Electrical)",
  "MBBS (Medicine)",
  "BDS (Dentistry)",
  "BSc Nursing",
  "BPH (Public Health)",
  "Pharmacy",
  "BBA (Business Administration)",
  "BBS (Business Studies)",
  "BBM (Business Management)",
  "BHM (Hotel Management)",
  "BA (Humanities & Social Sciences)",
  "BSW (Social Work)",
  "Journalism & Mass Communication",
  "LLB (Law)",
  "BALLB (Integrated Law)",
  "B.Ed (Education)",
  "Agriculture (BSc Ag)",
  "Forestry",
  "Architecture",
  "Fine Arts",
  "Fashion Design",
  "Other",
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    college_name: "",
    phone_number: "",
    email: "",
    interested_subject: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const validate = () => {
    if (!form.full_name.trim()) return "Full name is required.";
    if (!form.college_name.trim()) return "College name is required.";
    if (!/^\d{10}$/.test(form.phone_number.trim()))
      return "Enter a valid 10-digit phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return "Enter a valid email address.";
    if (!form.interested_subject)
      return "Please select your interested subject.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    try {
      // ✅ Fetch all matches — avoids PGRST116 crash
      const { data: matches, error: fetchErr } = await supabase
        .from("students")
        .select("id, full_name, attempt_count, email, phone_number")
        .or(
          `email.eq.${form.email.trim().toLowerCase()},phone_number.eq.${form.phone_number.trim()}`,
        );

      if (fetchErr) throw fetchErr;

      // Pick best match — email takes priority over phone
      const existing =
        matches?.find((s) => s.email === form.email.trim().toLowerCase()) ||
        matches?.find((s) => s.phone_number === form.phone_number.trim()) ||
        null;

      if (existing) {
        // Returning student — check attempt limit
        if (existing.attempt_count >= 2) {
          setError(
            "You have already used both your attempts. No more attempts are allowed.",
          );
          setLoading(false);
          return;
        }
        // Has attempts remaining — go to test
        navigate("/test", { state: { student: existing } });
        return;
      }

      // Brand new student — insert record
      const { data: newStudent, error: insertErr } = await supabase
        .from("students")
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

      navigate("/test", { state: { student: newStudent } });
    } catch (e) {
      console.error(e);
      if (e.code === "23505") {
        setError(
          "A student with this email or phone already exists. Please use your registered details.",
        );
      } else {
        setError("Something went wrong. Please try again.");
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
        <p className="page-subtitle">
          Fill in your details to start the test. You have 2 attempts.
        </p>

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
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <hr className="divider" />

        <div className="msg msg-info">
          <span>ℹ</span>
          <span>
            Test has <strong>100 questions</strong> · Time limit:{" "}
          </span>

          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Please wait…" : "Start Test →"}
          </button>
        </div>
      </div>
      <div
        className="msg msg-error"
        style={{ borderRadius: "8px", padding: "1rem" }}
      >
        <strong>📋 Rules</strong>
        <ul
          style={{ margin: "0.5rem 0 0 1.2rem", padding: 0, lineHeight: "1.8" }}
        >
          <li>
            You are allowed <strong>only 1 attempt</strong>.
          </li>
          <li>
            Do <strong>not</strong> exit fullscreen during the test.
          </li>
          <li>
            Do <strong>not</strong> visit other websites or switch tabs.
          </li>
          <li>Do not refresh or press the Back button.</li>
        </ul>
      </div>
    </div>
  );
}
