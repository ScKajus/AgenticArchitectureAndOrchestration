import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const webSearchTool: Tool = {
    name: "web_search",
    description: "Searches the web for information.",
    input_schema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "A search query to find information on the web."
            }
        },
        required: ["query"]
    }
}

export function runWebSearch(query: string): string {
    return JSON.stringify([
        {
            title: "Mock Result 1",
            snippet: `Information about ${query}`
        },
        {
            title: "Mock Result 2",
            snippet: `More information about ${query}`
        }
    ])
}