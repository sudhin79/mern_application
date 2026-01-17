import React, { useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async () => {
    try {
      const response = await fetch("/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("Saved successfully");
        setMessage("");
      } else {
        setStatus(data.error || "Failed to save");
      }
    } catch (err) {
      setStatus("Cannot reach backend");
      console.error(err);
    }
  };

  return (
    <div className="container">
      <h1>MERN Docker App</h1>

      <input
        type="text"
        placeholder="Enter text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button onClick={handleSubmit}>Save</button>

      {status && <p className="status">{status}</p>}
    </div>
  );
}

export default App;

