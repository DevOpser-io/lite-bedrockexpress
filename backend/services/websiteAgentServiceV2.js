/**
 * FILE: backend/services/websiteAgentServiceV2.js
 * PURPOSE: AI agent that uses tools to modify website configurations
 * DESCRIPTION: Uses Claude's native tool use via Bedrock to make actual changes
 *              to site configurations through a tool-use loop.
 */

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const config = require('../config');
const { WEBSITE_TOOLS, executeTool, getAgentSystemPrompt } = require('./websiteAgentTools');

// Initialize Bedrock client
let bedrockClient = null;

function getBedrockClient() {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({ region: config.bedrock.region || 'us-east-1' });
  }
  return bedrockClient;
}

/**
 * Process a user message using the tool-use agent
 * @param {string} userMessage - The user's message
 * @param {Object} currentConfig - Current site configuration
 * @param {Array} conversationHistory - Previous messages
 * @returns {Promise<Object>} - { message, newConfig, toolsUsed }
 */
async function processWithTools(userMessage, currentConfig = null, conversationHistory = []) {
  const client = getBedrockClient();
  let workingConfig = currentConfig ? JSON.parse(JSON.stringify(currentConfig)) : null;
  const toolsUsed = [];

  // Build messages for Converse API
  const messages = [];

  // Add conversation history (last 10 messages)
  for (const msg of conversationHistory.slice(-10)) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: [{ text: msg.content }]
    });
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: [{ text: userMessage }]
  });

  // Convert our tool definitions to Bedrock Converse format
  const toolConfig = {
    tools: WEBSITE_TOOLS.map(tool => ({
      toolSpec: {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          json: tool.input_schema
        }
      }
    }))
  };

  // System prompt
  const systemPrompt = [{ text: getAgentSystemPrompt(workingConfig) }];

  let maxIterations = 5; // Prevent infinite loops
  let iteration = 0;
  let finalResponse = '';

  while (iteration < maxIterations) {
    iteration++;
    console.log(`[AgentV2] Iteration ${iteration}, messages: ${messages.length}`);

    try {
      const response = await client.send(new ConverseCommand({
        modelId: config.bedrock.modelId,
        messages,
        system: systemPrompt,
        toolConfig,
        inferenceConfig: {
          maxTokens: config.bedrock.maxTokens || 4096,
          temperature: 0.7
        }
      }));

      const output = response.output;
      const stopReason = response.stopReason;

      console.log(`[AgentV2] Stop reason: ${stopReason}`);

      // Check if Claude wants to use tools
      if (stopReason === 'tool_use') {
        // Find tool use blocks in the response
        const assistantContent = output.message?.content || [];
        const toolUseBlocks = assistantContent.filter(block => block.toolUse);
        const textBlocks = assistantContent.filter(block => block.text);

        // Add assistant's response to messages
        messages.push({
          role: 'assistant',
          content: assistantContent
        });

        // Execute each tool and collect results
        const toolResults = [];

        for (const block of toolUseBlocks) {
          const { toolUseId, name, input } = block.toolUse;
          console.log(`[AgentV2] Executing tool: ${name}`, JSON.stringify(input).substring(0, 200));

          // Execute the tool
          const result = executeTool(name, input, workingConfig);
          toolsUsed.push({ name, input, result: result.message });

          // Update working config if tool succeeded
          if (result.success && result.config) {
            workingConfig = result.config;
          }

          // Add tool result
          toolResults.push({
            toolResultId: toolUseId,
            status: result.success ? 'success' : 'error',
            content: [{ text: result.message }]
          });
        }

        // Add tool results to messages
        messages.push({
          role: 'user',
          content: toolResults.map(r => ({
            toolResult: {
              toolUseId: r.toolResultId,
              status: r.status,
              content: r.content
            }
          }))
        });

        // Continue the loop to get Claude's follow-up
        continue;

      } else if (stopReason === 'end_turn' || stopReason === 'stop_sequence') {
        // Claude is done - extract the final text response
        const assistantContent = output.message?.content || [];
        for (const block of assistantContent) {
          if (block.text) {
            finalResponse += block.text;
          }
        }
        break;

      } else {
        // Unexpected stop reason
        console.warn(`[AgentV2] Unexpected stop reason: ${stopReason}`);
        break;
      }

    } catch (error) {
      console.error('[AgentV2] Error calling Bedrock:', error);
      throw error;
    }
  }

  // If no response generated, provide a default
  if (!finalResponse && toolsUsed.length > 0) {
    finalResponse = `Done! I made ${toolsUsed.length} change(s) to your website.`;
  } else if (!finalResponse) {
    finalResponse = "I'm not sure how to help with that. Try describing what kind of website you want, or ask me to make specific changes.";
  }

  return {
    message: finalResponse,
    newConfig: workingConfig,
    toolsUsed
  };
}

/**
 * Generate a site from a description (convenience wrapper)
 * @param {string} description - Site description
 * @returns {Promise<Object>} - { message, newConfig, toolsUsed }
 */
async function generateSiteFromDescription(description) {
  return processWithTools(description, null, []);
}

/**
 * Update site based on feedback
 * @param {Object} currentConfig - Current config
 * @param {string} feedback - User feedback
 * @param {Array} history - Conversation history
 * @returns {Promise<Object>} - { message, newConfig, toolsUsed }
 */
async function updateSiteFromFeedback(currentConfig, feedback, history = []) {
  return processWithTools(feedback, currentConfig, history);
}

module.exports = {
  processWithTools,
  generateSiteFromDescription,
  updateSiteFromFeedback
};
