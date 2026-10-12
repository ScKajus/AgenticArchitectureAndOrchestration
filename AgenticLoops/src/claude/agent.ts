import { claude } from "./client";
import { tools } from "../tools";
import { runCalculator } from "../tools/calculator";
import { runWebSearch } from "../tools/webSearch";
import Anthropic from "@anthropic-ai/sdk";

export async function runAgent(userMessage: string) {
  let messages: any[] = [
    {
      role: "user",
      content: userMessage,
    },
  ];

  while (true) {
    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      tools,
      messages,
    });

    console.log("Claude stop reason: ", response.stop_reason);

    if (response.stop_reason === "end_turn") {
      console.log("Claude response: ", response.content);
      const result = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      return result;
    }

    if (response.stop_reason === "tool_use") {
      messages.push({
        role: "assistant",
        content: response.content,
      });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const toolBlock = block as Anthropic.ToolUseBlockParam;
          const toolInput = toolBlock.input as { expression?: string, query?: string };

          if (toolBlock.name === "calculator") {
            const expression = toolInput.expression ?? "";
            const result = runCalculator(expression);
            toolResults.push({
              tool_use_id: toolBlock.id,
              type: "tool_result",
              content: result,
            });
          }

          if (toolBlock.name === "web_search") {
            const query = toolInput.query ?? "";
            const result = runWebSearch(query);
            toolResults.push({
              tool_use_id: toolBlock.id,
              type: "tool_result",
              content: result,
            });
          }
        }
      }
      console.log("Tool results: ", toolResults);
          messages.push({
            role: "user",
            content: toolResults,
          });
    }
  }
}
