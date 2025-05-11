import Webcam from "react-webcam";
import { useRef, useState, useEffect, useCallback } from "react";

export function Live() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [results, setResults] = useState([]);
  const [intervalId, setIntervalId] = useState(null);

  // Automatically start detection on mount
  useEffect(() => {
    const id = setInterval(captureFrame, 3000); // every 1 second
    setIntervalId(id);

    return () => clearInterval(id); // clean up
  }, []);

  const captureFrame = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();

    if (!imageSrc) return;

    try {
      const response = await fetch("http://localhost:3001/api/recognize", {
        method: "POST",
        body: JSON.stringify({ image: imageSrc }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Recognition API error:", errorText);
        return;
      }

      const data = await response.json();
      setResults(data.results || []);
      drawBoxes(data.results || []);
    } catch (err) {
      console.error("Error during captureFrame:", err);
    }
  }, []);

  const drawBoxes = (results) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.font = "16px Arial";
    ctx.fillStyle = "lime";

    results.forEach(({ bounding_box, name, status }) => {
      const [top, right, bottom, left] = bounding_box;
      const width = right - left;
      const height = bottom - top;

      ctx.beginPath();
      ctx.rect(left, top, width, height);
      ctx.stroke();
      ctx.fillText(status === "match" ? name : "Unknown", left, top - 5);
    });
  };

  return (
    <div>
      <h2>Live Face Recognition</h2>
      <div style={{ position: "relative", width: 640, height: 480 }}>
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={640}
          height={480}
          videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      </div>
    </div>
  );
}
