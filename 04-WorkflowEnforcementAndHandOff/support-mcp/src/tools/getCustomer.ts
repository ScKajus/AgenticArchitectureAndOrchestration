import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { customers, orders, verifiedCustomerIds, type Customer } from "../data.ts";
import { fail, ok } from "../result.ts";

const normalize = (value: string) => value.trim().toLowerCase();
const digits = (value: string) => value.replace(/\D/g, "");

function matchesAnswer(customer: Customer, answer: string): boolean {
    const a = normalize(answer);
    return (
        a === normalize(customer.postcode) ||
        a === customer.card_last4 ||
        orders.some(o => o.customer_id === customer.customer_id && normalize(o.order_id) === a)
    );
}

export function registerGetCustomer(server: McpServer) {
    server.registerTool(
        "get_customer",
        {
            title: "Get customer",
            description:
                "Finds a customer by email, phone, or customer ID and checks their identity. Returns customer_id and " +
                "verification_status: 'verified' (one match), 'ambiguous' (several matches: call again with " +
                "verification_answer), or 'not_found'. Must return 'verified' before process_refund accepts the customer_id.",
            inputSchema: {
                email: z.string().optional().describe("Email address the customer gave"),
                phone: z.string().optional().describe("Phone number the customer gave"),
                customer_id: z.string().optional().describe("Customer ID the customer gave, e.g. C-10442"),
                verification_answer: z
                    .string()
                    .optional()
                    .describe("Extra identifier the customer gave: an order number, postcode, or last 4 card digits"),
            },
            annotations: { readOnlyHint: true },
        },
        async ({ email, phone, customer_id, verification_answer }) => {
            if (!email && !phone && !customer_id) {
                return fail("invalid_input", "Provide at least one of email, phone, or customer_id.");
            }

            let matches = customers.filter(
                c =>
                    (!email || normalize(c.email) === normalize(email)) &&
                    (!phone || digits(c.phone) === digits(phone)) &&
                    (!customer_id || normalize(c.customer_id) === normalize(customer_id)),
            );
            if (verification_answer) {
                matches = matches.filter(c => matchesAnswer(c, verification_answer));
            }

            if (matches.length === 1) {
                const id = matches[0].customer_id;
                verifiedCustomerIds.add(id);
                return ok({ customer_id: id, verification_status: "verified", matches: 1 });
            }
            return ok({
                customer_id: null,
                verification_status: matches.length === 0 ? "not_found" : "ambiguous",
                matches: matches.length,
            });
        },
    );
}
