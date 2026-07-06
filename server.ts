import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";

dotenv.config();

function getExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return ".mp4";
  if (mimeType.includes("webm")) return ".webm";
  if (mimeType.includes("quicktime")) return ".mov";
  if (mimeType.includes("ogg")) return ".ogg";
  return ".mp4";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set high limits for JSON/URL-encoded requests (though video uses raw stream)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Video Analysis Endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const { frames, customApiKey, instructions } = req.body;
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(401).json({
          error: "No Gemini API Key provided. Please enter an API key in Settings, or configure GEMINI_API_KEY on the server."
        });
      }

      if (!frames || !frames.length) {
        return res.status(400).json({ error: "No video frames provided." });
      }

      console.log(`[Gemini API] Initializing with key ending in: ...${String(apiKey).slice(-5)}`);

      const ai = new GoogleGenAI({
        apiKey: String(apiKey),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      console.log(`[Gemini API] Processing ${frames.length} frames...`);

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          guide_title: {
            type: Type.STRING,
            description: "A professional, catchy, and concise title for the user guide."
          },
          target_audience: {
            type: Type.STRING,
            description: "The intended audience or user type for this guide."
          },
          summary: {
            type: Type.STRING,
            description: "A brief, clear overview of what is accomplished in this guide."
          },
          steps: {
            type: Type.ARRAY,
            description: "The sequence of step-by-step instructions.",
            items: {
              type: Type.OBJECT,
              properties: {
                step_number: { type: Type.INTEGER },
                timestamp: {
                  type: Type.STRING,
                  description: "The timestamp when the action or transition is clearly visible, format MM:SS."
                },
                title: {
                  type: Type.STRING,
                  description: "A concise action-oriented step title (e.g., 'Click the Settings button')."
                },
                action: {
                  type: Type.STRING,
                  description: "A detailed explanation of what the user does in this step."
                },
                visual_cue: {
                  type: Type.STRING,
                  description: "A description of what the user should see on screen at this moment as feedback."
                }
              },
              required: ["step_number", "timestamp", "title", "action", "visual_cue"]
            }
          }
        },
        required: ["guide_title", "target_audience", "summary", "steps"]
      };

      const systemPrompt = "You are an expert technical writer and UI analyst. Analyze these screen recording frames and build a professional, perfectly sequential step-by-step user guide documentation. Detect each distinct action, click, page transition, or setup step. Important: If the user is filling out a form with multiple fields, group the entire form filling process into a SINGLE step (e.g. 'Fill out the form fields') rather than creating separate steps for each field. For each step, provide a precise timestamp in MM:SS format based on the frames where the final state of that action is cleanly visible. Keep steps sequential, clear, and actionable. Note: The timestamps of the provided frames are given in the prompt, try to match the actions to these timestamps.";
      const userInstructions = instructions ? `\n\nAdditional user guidelines: ${instructions}` : "";

      const promptContents: any[] = [systemPrompt + userInstructions];
      
      // Inject frames into the prompt
      frames.forEach((frame: { timestamp: string, base64: string }) => {
        promptContents.push(`Frame at ${frame.timestamp}:`);
        promptContents.push({ inlineData: { mimeType: "image/jpeg", data: frame.base64 } });
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptContents,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      if (!response.text) {
        throw new Error("Empty response received from Gemini model.");
      }

      console.log(`[Gemini API] Analysis completed successfully!`);
      const structuredJson = JSON.parse(response.text);
      res.json(structuredJson);

    } catch (error: any) {
      console.error("[Gemini API Error]", error);
      res.status(500).json({ error: error.message || "An error occurred during video analysis." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite middleware mounted in development mode.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Server] Serving static files in production mode.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
