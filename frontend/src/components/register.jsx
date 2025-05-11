import Webcam from "react-webcam";
import { useRef, useState } from "react";
import "./register.css";

export function Registration() {
    const webcamRef = useRef(null);
    const [screenshot, setScreenshot] = useState(null);
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState(""); // 'success' or 'error'

    const captureAndSend = async (e) => {
        e.preventDefault();
        
        if (!name) {
            setMessage("Please enter your name");
            setMessageType("error");
            return;
        }
    
        const image = webcamRef.current.getScreenshot();
        if (!image) {
            setMessage("Please capture an image first");
            setMessageType("error");
            return;
        }
    
        setScreenshot(image);
        setIsLoading(true);
        setMessage("");
        setMessageType("");
    
        try {
            const response = await fetch("http://localhost:3001/api/register", {
                method: "POST",
                body: JSON.stringify({ 
                    image, 
                    name 
                }),
                headers: { "Content-Type": "application/json" },
            });
            
            const result = await response.json();
            
            if (response.ok) {
                setMessage(`Success! ${name} has been registered.`);
                setMessageType("success");
                setName("");
                setScreenshot(null);
            } else {
                // Display the detailed error message from backend
                const errorMessage = result.detail || result.error || "Registration failed";
                setMessage(errorMessage);
                setMessageType("error");
            }
        } catch (error) {
            console.error("Error:", error);
            setMessage("Failed to connect to server");
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="registration-container">
            <h2>Face Registration</h2>
            
            <Webcam 
                ref={webcamRef} 
                screenshotFormat="image/jpeg"
                style={{ width: '100%', maxWidth: '640px' }}
            />
            
            <form onSubmit={captureAndSend}>
                <div className="form-group">
                    <label htmlFor="name">Your Name:</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            // Clear error when user starts typing
                            if (messageType === "error") {
                                setMessage("");
                                setMessageType("");
                            }
                        }}
                        placeholder="Enter your name"
                        required
                    />
                </div>
                
                <button 
                    type="submit" 
                    disabled={isLoading}
                >
                    {isLoading ? "Processing..." : "Capture & Register"}
                </button>
            </form>
            
            {message && (
                <div className={`message ${messageType}`}>
                    {message}
                </div>
            )}
            
            {screenshot && (
                <div className="screenshot-preview">
                    <h3>Captured Image:</h3>
                    <img 
                        src={screenshot} 
                        alt="Captured" 
                        style={{ width: '100%', maxWidth: '640px' }}
                    />
                </div>
            )}
        </div>
    );   
}