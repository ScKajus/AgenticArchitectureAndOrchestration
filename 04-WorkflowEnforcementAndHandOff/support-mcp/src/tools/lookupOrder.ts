import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orders, verifiedCustomerIds } from "../data.ts";
import { fail, ok } from "../result.ts";

export function registerLookupOrder(server: McpServer) {
    server.registerTool(
        "lookup_order",
        {
            title: "Look up order",
            description:
                "Returns the details of one order: owner customer_id, status, items, total, order and delivery dates, " +
                "and the amount already refunded. Requires a customer verified with get_customer in this session.",
            inputSchema: {
                order_id: z.string().describe("Order number, e.g. O-88213"),
            },
            annotations: { readOnlyHint: true },
        },
        async ({ order_id }) => {
            if (verifiedCustomerIds.size === 0) {
                return fail("permission_denied", "No customer has been verified. Call get_customer first.");
            }
            if (!/^O-\d+$/i.test(order_id.trim())) {
                return fail("invalid_input", `'${order_id}' is not a valid order number. Expected a format like O-88213.`);
            }

            const order = orders.find(o => o.order_id.toLowerCase() === order_id.trim().toLowerCase());
            if (!order) {
                return fail("not_found", `No order found with number ${order_id}.`);
            }
            return ok(order);
        },
    );
}
