import { useState } from "react";

function App() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  const sendData = async () => {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    setMsg(data.message);
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>MERN Docker App</h1>

      <input
        type="text"
        placeholder="Enter something..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ padding: "10px", width: "250px" }}
      />

      <br /><br />

      <button onClick={sendData} style={{ padding: "10px 20px" }}>
        Save to Database
      </button>

      <p>{msg}</p>
    </div>
  );
}

export default App;
