import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for sending error responses
const sendError = (res: express.Response, message: string, status = 500) => {
  res.status(status).json({ error: message });
};

// Helper for fallback model generation to handle model spikes/503 errors
async function generateContentWithFallback(params: any) {
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (error: any) {
      console.log(`[Info] Model ${model} is busy, trying fallback...`);
      lastError = error;
    }
  }
  throw lastError;
}

// 1. AI TASK ANALYZER
app.post("/api/analyze-goal", async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal) {
      return res.status(400).json({ error: "Goal is required" });
    }

    const response = await generateContentWithFallback({
      contents: `Analyze the following productivity goal and break it down into structured elements, priorities, estimate efforts, and recommendations: "${goal}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goalSummary: { type: Type.STRING, description: "A concise, high-level summary of the user's goal" },
            priority: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"], description: "Priority of the goal based on context" },
            estimatedEffort: { type: Type.STRING, description: "Estimated time or effort required to complete (e.g. '15-20 hours')" },
            breakdown: {
              type: Type.ARRAY,
              description: "Step by step tasks list with subtasks",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Main task title" },
                  subtasks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["title"]
              }
            },
            timeline: {
              type: Type.ARRAY,
              description: "Milestones or timeframe roadmap (e.g., Today, Tomorrow, Days before deadline)",
              items: {
                type: Type.OBJECT,
                properties: {
                  timeframe: { type: Type.STRING, description: "Timeframe title, e.g. 'Today', 'Phase 1', 'Day 2'" },
                  focus: { type: Type.STRING, description: "What to focus on during this timeframe" }
                },
                required: ["timeframe", "focus"]
              }
            },
            recommendedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Proactive expert actions to ensure success"
            }
          },
          required: ["goalSummary", "priority", "estimatedEffort", "breakdown", "timeline", "recommendedActions"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/analyze-goal:", error);
    sendError(res, error.message || "Failed to analyze goal");
  }
});

// 2. DEADLINE RISK PREDICTOR
app.post("/api/predict-risk", async (req, res) => {
  try {
    const { goal, dueDate, remainingTasksCount, userWorkload } = req.body;
    if (!goal) {
      return res.status(400).json({ error: "Goal details are required" });
    }

    const response = await generateContentWithFallback({
      contents: `Predict the deadline risk for a goal.
Goal: ${goal}
Due Date: ${dueDate || "Not specified"}
Remaining Tasks Count: ${remainingTasksCount || "0"}
User Current Workload: ${userWorkload || "Normal"}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
            reason: { type: Type.STRING, description: "A detailed explanation of why this risk level was predicted" },
            suggestions: { type: Type.STRING, description: "Actionable advice to reduce risk and meet the deadline" }
          },
          required: ["riskLevel", "reason", "suggestions"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/predict-risk:", error);
    sendError(res, error.message || "Failed to predict risk");
  }
});

// 3. ACTIVEFLOW DAILY PLANNER
app.post("/api/generate-daily-plan", async (req, res) => {
  try {
    const { tasks, userPatterns, userPreferences } = req.body;

    const taskListString = Array.isArray(tasks) 
      ? tasks.map((t: any) => `- [${t.priority || "MEDIUM"} Priority] ${t.goal} (Due: ${t.dueDate || 'Soon'}, Status: ${t.status})`).join("\n")
      : "No current tasks";

    const response = await generateContentWithFallback({
      contents: `Generate a structured, highly focused daily plan based on the user's tasks, preferences, and productivity patterns.
Current Tasks:\n${taskListString}
Productivity Patterns:\n${JSON.stringify(userPatterns || {})}
User Preferences:\n${JSON.stringify(userPreferences || {})}

Explain why tasks were prioritized in the recommendation. Make the schedule realistic and balanced.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            focus: { type: Type.STRING, description: "Core objective or theme for today" },
            timeline: {
              type: Type.ARRAY,
              description: "Hour-by-hour planner",
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING, description: "Time slot, e.g. '09:00', '13:00'" },
                  task: { type: Type.STRING, description: "Activity/task description" },
                  reason: { type: Type.STRING, description: "Why this was scheduled at this time" }
                },
                required: ["time", "task", "reason"]
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "AI notes explaining state updates or flow tips based on user's memory patterns"
            }
          },
          required: ["focus", "timeline", "recommendations"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/generate-daily-plan:", error);
    sendError(res, error.message || "Failed to generate daily plan");
  }
});

// 4. LAST MINUTE RESCUE MODE
app.post("/api/generate-rescue-plan", async (req, res) => {
  try {
    const { emergencyGoal, timeRemaining } = req.body;
    if (!emergencyGoal) {
      return res.status(400).json({ error: "Emergency goal details are required" });
    }

    const response = await generateContentWithFallback({
      contents: `CRITICAL ACTION REQUIRED: Create a hyper-focused, hourly emergency rescue plan for a user facing a tight deadline.
Goal: ${emergencyGoal}
Time Remaining: ${timeRemaining || "Less than 24 hours"}

Break it down into precise chronological blocks (Hour 1, Hour 2-3, etc.), emphasizing focus, scope reduction, and quick wins to meet the absolute deadline successfully.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            focus: { type: Type.STRING, description: "Immediate mental posture or tactical strategy" },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hour: { type: Type.STRING, description: "Timeframe block, e.g. 'Hour 1', 'Hour 2-4'" },
                  task: { type: Type.STRING, description: "Crucial direct action to take" }
                },
                required: ["hour", "task"]
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Emergency survival rules (e.g. 'Turn off notifications', 'Skip perfectionism')"
            }
          },
          required: ["focus", "timeline", "recommendations"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/generate-rescue-plan:", error);
    sendError(res, error.message || "Failed to generate emergency rescue plan");
  }
});

// 5. AI PRODUCTIVITY CHAT ASSISTANT
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Prepare context system instruction
    const userTasksStr = context?.tasks && Array.isArray(context.tasks)
      ? context.tasks.map((t: any) => `- ${t.goal} (${t.priority} priority, status: ${t.status})`).join("\n")
      : "None";

    const systemInstruction = `You are an expert AI productivity coach and personal assistant for ActiveFlow AI - "The Last Minute Life Saver".
Your goal is to actively guide users, break down complex tasks into atomic actionable steps, suggest realistic actions, and help them overcome overwhelm.
Be extremely motivating, supportive, and practical. Do not use generic advice. Refer to their current context to provide highly personalized answers.

Here is the user's current context:
Active Tasks:
${userTasksStr}
User Preferences: ${JSON.stringify(context?.preferences || {})}
Productivity Patterns: ${JSON.stringify(context?.patterns || {})}`;

    // Convert history to format needed for chat or just use contents
    const chatContents = [];
    
    // Seed previous history if it exists
    if (history && Array.isArray(history) && history.length > 0) {
      history.forEach((h: any) => {
        chatContents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }]
        });
      });
    }
    
    chatContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await generateContentWithFallback({
      contents: chatContents,
      config: {
        systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    sendError(res, error.message || "Failed to process chat message");
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
