import { useState, useEffect } from "react";
import API from "../../Services/Api";

export default function ScoreResultsPage() {
  const [evaluation, setEvaluation] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evalRes, placementRes] = await Promise.all([
          API.get("/evaluations/my/"),
          API.get("/placements/my/"),
        ]);
        setEvaluation(evalRes.data[0] || evalRes.data || null);
        setPlacement(placementRes.data[0] || placementRes.data || null);
      } catch {
        setError("Could not load evaluation data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error || !evaluation) return <p>No evaluation results yet. {error}</p>;

  const total = parseFloat(evaluation.total_score);
  const getGrade = (score) => {
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "F";
  };
  const grade = getGrade(total);

  return (
    <div>
      <h1>Evaluation Results</h1>
      {placement && (
        <div style={{ background: '#f0f0f0', padding: '16px', marginBottom: '20px' }}>
          <strong>{placement.company_name}</strong> — {placement.start_date} to {placement.end_date}
        </div>
      )}
      <div style={{ border: '2px solid #333', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div>Overall Score</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{total.toFixed(1)}</div>
        <div>Grade: {grade}</div>
      </div>
      <div>
        <h3>Score Breakdown</h3>
        <table style={{ width: '100%' }}>
          <thead><tr><th>Component</th><th>Raw Score</th><th>Weight</th><th>Weighted</th></tr></thead>
          <tbody>
            <tr><td>Logbook</td><td>{evaluation.logbook_score}</td><td>40%</td><td>{(evaluation.logbook_score * 0.4).toFixed(2)}</td></tr>
            <tr><td>Supervisor</td><td>{evaluation.supervisor_score}</td><td>30%</td><td>{(evaluation.supervisor_score * 0.3).toFixed(2)}</td></tr>
            <tr><td>Presentation</td><td>{evaluation.presentation_score}</td><td>30%</td><td>{(evaluation.presentation_score * 0.3).toFixed(2)}</td></tr>
            <tr style={{ fontWeight: 'bold' }}><td colSpan="3">Total</td><td>{total.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>
      {evaluation.comments && <div><h3>Comments</h3><p>{evaluation.comments}</p></div>}
    </div>
  );
}