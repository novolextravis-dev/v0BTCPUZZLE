// Autonomous agent API endpoint

import { createAgentState, executeTool, agentTools, runAutonomousAgent, type AgentState } from "@/lib/agent-system"

// Store agent states in memory (in production, use a database)
const agentStates = new Map<string, AgentState>()

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, sessionId, toolName, params, maxIterations } = body

    // Get or create session state
    const state = agentStates.get(sessionId || "default") || createAgentState()

    switch (action) {
      case "list_tools":
        return Response.json({
          success: true,
          tools: agentTools.map((t) => ({
            name: t.name,
            description: t.description,
          })),
        })

      case "execute_tool":
        if (!toolName) {
          return Response.json(
            {
              success: false,
              error: "Tool name required",
            },
            { status: 400 },
          )
        }

        const { result, newState } = await executeTool(toolName, params || {}, state)
        agentStates.set(sessionId || "default", newState)

        return Response.json({
          success: true,
          result,
          state: {
            currentPhase: newState.currentPhase,
            attempts: newState.attempts,
            discoveries: newState.discoveries,
            potentialKeys: newState.potentialKeys.length,
            validatedResults: newState.validatedResults,
            logs: newState.logs.slice(-20),
          },
        })

      case "run_autonomous":
        const finalState = await runAutonomousAgent(state, maxIterations || 5)
        agentStates.set(sessionId || "default", finalState)

        return Response.json({
          success: true,
          state: {
            currentPhase: finalState.currentPhase,
            attempts: finalState.attempts,
            discoveries: finalState.discoveries,
            potentialKeys: finalState.potentialKeys.length,
            validatedResults: finalState.validatedResults,
            failedApproaches: finalState.failedApproaches,
            logs: finalState.logs,
          },
        })

      case "get_state":
        return Response.json({
          success: true,
          state: {
            currentPhase: state.currentPhase,
            attempts: state.attempts,
            discoveries: state.discoveries,
            potentialKeys: state.potentialKeys.length,
            validatedResults: state.validatedResults,
            failedApproaches: state.failedApproaches,
            webResearch: state.webResearch,
            imageAnalysis: state.imageAnalysis,
            logs: state.logs.slice(-50),
          },
        })

      case "reset":
        agentStates.set(sessionId || "default", createAgentState())
        return Response.json({
          success: true,
          message: "Agent state reset",
        })

      default:
        return Response.json(
          {
            success: false,
            error: `Unknown action: ${action}`,
          },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("[v0] Agent API error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
