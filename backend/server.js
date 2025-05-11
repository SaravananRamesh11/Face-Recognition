const express = require("express");
const fs = require("fs");
const axios = require("axios");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const FormData = require("form-data");
const app = express();
const PORT = 3001;

// Configure CORS more comprehensively
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Increase payload limit for image data
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Constants
const PYTHON_API_BASE = "http://127.0.0.1:8000";
const DEFAULT_THRESHOLD = 0.6;

// Helper function to handle temporary files
async function withTempFile(base64Data, callback) {
    const filename = `temp_${uuidv4()}.jpg`;
    const filepath = `./${filename}`;
    
    try {
        // Strip the data URL prefix if present
        const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filepath, cleanBase64, "base64");
        
        // Execute the callback with the file path
        return await callback(filepath);
    } finally {
        // Clean up the temp file
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    }
}

// Face registration endpoint (existing)
app.post("/api/register", async (req, res) => {
    try {
        const { name, image } = req.body;

        if (!name || !image) {
            return res.status(400).json({ 
                error: "Validation Error",
                detail: "Name and image are required" 
            });
        }

        const result = await withTempFile(image, async (filepath) => {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("file", fs.createReadStream(filepath), {
                filename: `register_${uuidv4()}.jpg`,
                contentType: "image/jpeg"
            });

            const response = await axios.post(
                `${PYTHON_API_BASE}/add_face/`, 
                formData,
                { headers: formData.getHeaders() }
            );

            return response.data;
        });

        return res.status(200).json({ 
            message: "Face registered successfully", 
            data: result 
        });

    } catch (error) {
        console.error("Registration error:", error.response?.data || error.message);
        
        if (error.response?.data?.detail === "Name must be unique.") {
            return res.status(400).json({ 
                error: "Name must be unique",
                detail: "The name you provided is already registered."
            });
        }

        return res.status(500).json({
            error: "Server Error",
            detail: error.response?.data?.detail || error.message || "Registration failed"
        });
    }
});


app.post("/api/recognize", async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                error: "Validation Error",
                detail: "Image is required"
            });
        }

        const result = await withTempFile(image, async (filepath) => {
            const formData = new FormData();
            formData.append("file", fs.createReadStream(filepath), {
                filename: `recognize_${uuidv4()}.jpg`,
                contentType: "image/jpeg"
            });

            const response = await axios.post(
                `${PYTHON_API_BASE}/identify_face/`,
                formData,
                { headers: formData.getHeaders() }
            );

            return response.data;
        });

        return res.status(200).json({
            message: "Recognition successful",
            results: result
        });

    } catch (error) {
        console.error("Recognition error:", error.response?.data || error.message);
        return res.status(500).json({
            error: "Server Error",
            detail: error.response?.data?.detail || error.message || "Recognition failed"
        });
    }
});


app.listen(PORT, () => {
    console.log(`Node backend listening at http://localhost:${PORT}`);
});