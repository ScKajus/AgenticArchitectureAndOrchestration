import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const calculatorTool: Tool = {
    name: "calculator",
    description: "Calculates the result of a mathematical expression.",
    input_schema: {
        type: "object",
        properties: {
            expression: {
                type: "string",
                description: "A mathematical expression to evaluate, e.g., '2 + 2'"
            }
        },
        required: ["expression"]
    }
}

export function runCalculator(expression: string): string {
    try {
        const result = eval(expression);
        return String(result);
    }
    catch {
        return "Error: Invalid mathematical expression.";
    }
}