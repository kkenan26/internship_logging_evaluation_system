import { useState, useEffect } from "react";
import API from "../../Services/Api";

export default function AcademicEvaluationPage() {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await API.get("/placements/");
        const placements = Array.isArray(res.data) ? res.data : res.data.results || [];
        const list = placements.filter(p => p.academic_supervisor_name).map(p => ({
          id: p.student,
          name: p.student_name,
          placementId: p.id,
        }));
        setStudents(list);
      } catch {
        setStudents([]);
      }
    };
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const payload = {
        student: selected.id,
        placement: selected.placementId,
        score: parseFloat(score),
        feedback: feedback,
      };
      await API.post("/evaluations/academic/", payload);
      setMessage("Evaluation submitted.");
      setScore("");
      setFeedback("");
      setSelected(null);
    } catch {
      setMessage("Submission failed.");
    }
  };

  return (
    <div>
      <h1>Academic Evaluation</h1>
      <select value={selected?.id || ""} onChange={(e) => setStudents.find(s => s.id == e.target.value) && setSelected(students.find(s => s.id == e.target.value))}>
        <option value="">Select student</option>
        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {selected && (
        <form onSubmit={handleSubmit}>
          <div><label>Score (0-100)</label><input type="number" value={score} onChange={e => setScore(e.target.value)} min="0" max="100" required /></div>
          <div><label>Feedback</label><textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} /></div>
          <button type="submit">Submit Evaluation</button>
        </form>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}