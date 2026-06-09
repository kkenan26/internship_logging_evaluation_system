import { useState, useEffect } from "react";
import API from "../../Services/Api";

export default function AcademicEvaluationPage() {
  const [students, setStudents] = useState([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState("");
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await API.get("/placements/");
      let placements = res.data;
      if (!Array.isArray(placements)) placements = placements.results || [];
      const studentList = placements
        .filter(p => p.academic_supervisor_name)
        .map(p => ({
          placementId: p.id,
          studentName: p.student_name,
          company: p.company_name,
        }));
      setStudents(studentList);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load students." });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlacementId) return;
    setMessage({ type: "", text: "" });
    try {
      await API.post("/evaluations/academic/", {
        placement: parseInt(selectedPlacementId),
        score: parseFloat(score),
        comments: comments,
      });
      setMessage({ type: "success", text: "Evaluation submitted!" });
      setScore("");
      setComments("");
    } catch (err) {
      const data = err.response?.data;
      setMessage({ type: "error", text: data?.error || data?.detail || "Submission failed." });
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Academic Evaluation</h1>
      {message.text && (
        <div style={{ background: message.type === "success" ? "#d0f0d0" : "#ffe0e0", padding: "10px", marginBottom: "16px" }}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "12px" }}>
          <label>Select Student: </label>
          <select
            value={selectedPlacementId}
            onChange={(e) => setSelectedPlacementId(e.target.value)}
            required
            style={{ padding: "8px", width: "250px" }}
          >
            <option value="">-- Select a student --</option>
            {students.map(s => (
              <option key={s.placementId} value={s.placementId}>
                {s.studentName} ({s.company})
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label>Score (0-100): </label>
          <input
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
            style={{ padding: "8px", width: "100px", marginLeft: "10px" }}
          />
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label>Comments: </label><br />
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows="4"
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <button type="submit" style={{ background: "#1976d2", color: "#fff", border: "none", padding: "10px 20px", cursor: "pointer" }}>
          Submit Evaluation
        </button>
      </form>
    </div>
  );
}