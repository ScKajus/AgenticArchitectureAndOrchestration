import { appendFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { handoffs, orders, verifiedCustomerIds } from "../data.ts";
import { fail, ok } from "../result.ts";

const QUEUE_FILE = new URL("../../handoffs.jsonl", import.meta.url);

const REASONS = [
    "customer_request",
    "exceeds_authority",
    "policy_gap",
    "identity_unverified",
    "system_error",
    "sensitive",
] as const;

const required = (description: string) => z.string().trim().min(1).describe(description);

export function registerEscalateToHuman(server: McpServer) {
    server.registerTool(
        "escalate_to_human",
        {
            title: "Escalate to human",
            description:
                "Hands one unresolved concern to a human agent with a self-contained summary. The human does not see " +
                "the conversation, so every field must stand on its own. Call once per handed-off concern. Returns a " +
                "handoff_id to reference in the reply to the customer.",
            inputSchema: {
                reason: z.enum(REASONS).describe("Why the concern is handed off"),
                customer: z
                    .object({
                        customer_id: z
                            .string()
                            .nullable()
                            .describe("Verified customer ID from get_customer, or null if the customer isn't verified"),
                        verification_status: z.enum(["verified", "ambiguous", "not_found", "not_attempted"]),
                        contact: required("Identifiers the customer gave: email, phone, or customer ID"),
                    })
                    .describe("Who the customer is"),
                conversation_summary: required(
                    "What the customer asked for and what happened in the conversation so far, in 2-5 sentences",
                ),
                concern: z
                    .object({
                        id: required("Concern ID, e.g. C2"),
                        summary: required("The single concern being handed off"),
                        customer_wants: required("The outcome the customer asked for, with amounts"),
                    })
                    .describe("The concern being handed off"),
                order_id: z.string().nullable().describe("Order the concern is about, or null if none"),
                refund_amount: z
                    .number()
                    .nonnegative()
                    .nullable()
                    .describe("Refund amount at stake (requested or recommended), or null if no refund is involved"),
                facts: z
                    .array(z.object({ fact: required("Something a tool returned"), source: required("Tool name") }))
                    .describe("Only facts returned by tools, each with its source tool"),
                actions_taken: z
                    .array(z.string())
                    .describe("Every tool call for this concern and its result, including failures and refunds issued"),
                root_cause: required("Short root cause analysis. Prefix with 'Unconfirmed: ' if no tool result supports it"),
                recommended_action: required("Specific next step for the human, with amounts and order IDs"),
                other_concerns: z
                    .array(
                        z.object({
                            id: z.string(),
                            summary: z.string(),
                            status: z.enum(["open", "resolved", "handed_off"]),
                        }),
                    )
                    .describe("Every other concern in this conversation and its status"),
                customer_notes: z.string().optional().describe("Tone, history, or anything else the human should know"),
            },
            annotations: { destructiveHint: false, idempotentHint: false },
        },
        async args => {
            const { reason, customer, order_id, refund_amount } = args;

            if (customer.customer_id !== null && !verifiedCustomerIds.has(customer.customer_id)) {
                return fail(
                    "permission_denied",
                    `Customer ${customer.customer_id} has not been verified. Pass customer_id null and list the ` +
                        "identifiers the customer gave under contact.",
                );
            }
            if (customer.customer_id === null && customer.verification_status === "verified") {
                return fail("invalid_input", "verification_status is 'verified' but customer_id is null.");
            }

            // Attach the order record from the system of record, so the human gets the real
            // figures even if the agent misreported them. Only for orders the customer owns.
            let order = null;
            if (order_id !== null) {
                order = orders.find(o => o.order_id.toLowerCase() === order_id.trim().toLowerCase()) ?? null;
                if (!order) {
                    return fail("not_found", `No order found with number ${order_id}.`);
                }
                if (order.customer_id !== customer.customer_id) {
                    return fail(
                        "permission_denied",
                        `Order ${order.order_id} does not belong to the verified customer. Pass order_id null.`,
                    );
                }
                if (refund_amount !== null && refund_amount > order.total - order.refunded_amount) {
                    return fail(
                        "invalid_input",
                        `refund_amount $${refund_amount.toFixed(2)} exceeds the refundable balance of ` +
                            `$${(order.total - order.refunded_amount).toFixed(2)} on ${order.order_id}.`,
                    );
                }
            }

            const handoff = {
                handoff_id: `H-${70100 + handoffs.length}`,
                reason,
                customer_id: customer.customer_id,
                order_id: order?.order_id ?? null,
                refund_amount,
                created_at: new Date().toISOString(),
            };
            handoffs.push(handoff);
            appendFileSync(QUEUE_FILE, JSON.stringify({ ...args, ...handoff, order_snapshot: order }) + "\n");
            console.error(`handoff ${handoff.handoff_id} queued (${reason})`);

            return ok({ handoff_id: handoff.handoff_id, status: "queued" });
        },
    );
}
