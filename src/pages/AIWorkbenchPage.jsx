import { useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";

export default function AIWorkbenchPage({ api }) {
  const [query, setQuery] = useState("Summarize active elections");
  const [text, setText] = useState("Try tacos and sushi this week");
  const [prompt, setPrompt] = useState("Dinner options for 4 people");
  const [electionId, setElectionId] = useState("");
  const [imageId, setImageId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const run = async (label, fn) => {
    setError("");
    setInfo("");
    try {
      const response = await fn();
      if (response.status >= 400) {
        setError(response.data?.message || `${label} failed`);
        return;
      }
      setResult(response.data?.data || response.data);
      setInfo(`${label} complete`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="panel">
      <h2>AI Workbench</h2>
      <p>Interact directly with `/ai/*` backend endpoints.</p>
      <ErrorBanner error={error} />
      <SuccessBanner message={info} />

      <div className="ai-grid">
        <div className="panel nested">
          <h3>Assistant Query</h3>
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn" onClick={() => run("Assistant query", () => api.post("/ai/assistant/query", { query }))}>Run</button>
        </div>

        <div className="panel nested">
          <h3>Suggest List Items</h3>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button className="btn" onClick={() => run("List suggestion", () => api.post("/ai/list/suggest-items", { prompt }))}>Run</button>
        </div>

        <div className="panel nested">
          <h3>Categorize + Moderate Text</h3>
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
          <div className="actions">
            <button className="btn" onClick={() => run("Categorize text", () => api.post("/ai/item/categorize", { text }))}>Categorize</button>
            <button className="btn btn-secondary" onClick={() => run("Moderate text", () => api.post("/ai/moderate", { text }))}>Moderate</button>
          </div>
        </div>

        <div className="panel nested">
          <h3>Election Analysis</h3>
          <input value={electionId} onChange={(e) => setElectionId(e.target.value)} placeholder="Election ID" />
          <div className="actions">
            <button className="btn" onClick={() => run("Election summary", () => api.get(`/ai/election/${electionId}/summary`))}>Summary</button>
            <button className="btn btn-secondary" onClick={() => run("Recommendations", () => api.get(`/ai/election/${electionId}/recommendations`))}>Recommendations</button>
            <button className="btn btn-secondary" onClick={() => run("Participant suggestions", () => api.get(`/ai/election/${electionId}/suggest-participants`))}>Participants</button>
          </div>
        </div>

        <div className="panel nested">
          <h3>Image Description</h3>
          <input value={imageId} onChange={(e) => setImageId(e.target.value)} placeholder="Image ID" />
          <button className="btn" onClick={() => run("Image description", () => api.get(`/ai/image/${imageId}/describe`))}>Describe</button>
        </div>

        <div className="panel nested">
          <h3>Notification Digest</h3>
          <button className="btn" onClick={() => run("Notification digest", () => api.get("/ai/notification/digest"))}>Generate</button>
        </div>
      </div>

      <h3>Result</h3>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
