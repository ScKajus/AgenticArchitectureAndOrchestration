import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type ErrorType = "invalid_input" | "not_found" | "permission_denied";

export function ok(data: object): CallToolResult {
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function fail(error_type: ErrorType, message: string): CallToolResult {
    return {
        isError: true,
        content: [{ type: "text", text: JSON.stringify({ error_type, message }, null, 2) }],
    };
}
