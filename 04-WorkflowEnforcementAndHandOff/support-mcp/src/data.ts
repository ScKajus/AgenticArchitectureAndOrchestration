// Mock customer and order data. Dates are relative to the day the server starts,
// so the 30-day refund window behaves the same whenever the demo is run.

export type OrderStatus = "pending" | "shipped" | "delivered" | "returned" | "cancelled";

export interface Customer {
    customer_id: string;
    name: string;
    email: string;
    phone: string;
    postcode: string;
    card_last4: string;
}

export interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

export interface Order {
    order_id: string;
    customer_id: string;
    status: OrderStatus;
    items: OrderItem[];
    total: number;
    currency: string;
    order_date: string;
    delivery_date: string | null;
    refunded_amount: number;
}

export interface Refund {
    refund_id: string;
    order_id: string;
    customer_id: string;
    amount: number;
    reason: string;
    created_at: string;
}

export const REFUND_LIMIT = 500;
export const REFUND_WINDOW_DAYS = 30;

export function daysAgo(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
}

export const customers: Customer[] = [
    { customer_id: "C-10442", name: "Jane Doe", email: "jane@example.com", phone: "+1-555-0101", postcode: "10001", card_last4: "4242" },
    { customer_id: "C-10443", name: "John Smith", email: "john.smith@example.com", phone: "+1-555-0102", postcode: "94105", card_last4: "1881" },
    // Two household members sharing one phone number: looking up by phone is ambiguous.
    { customer_id: "C-10445", name: "Alex Kim", email: "alex.kim@example.com", phone: "+1-555-0199", postcode: "60601", card_last4: "3005" },
    { customer_id: "C-10446", name: "Sam Kim", email: "sam.kim@example.com", phone: "+1-555-0199", postcode: "60601", card_last4: "7720" },
];

export const orders: Order[] = [
    // Jane: over the refund limit, late shipment, small refundable order.
    {
        order_id: "O-88213", customer_id: "C-10442", status: "delivered",
        items: [{ name: "Blender X200", quantity: 1, price: 649.0 }],
        total: 649.0, currency: "USD", order_date: daysAgo(19), delivery_date: daysAgo(12), refunded_amount: 0,
    },
    {
        order_id: "O-88190", customer_id: "C-10442", status: "shipped",
        items: [{ name: "Coffee grinder", quantity: 1, price: 89.0 }],
        total: 89.0, currency: "USD", order_date: daysAgo(14), delivery_date: null, refunded_amount: 0,
    },
    {
        order_id: "O-88214", customer_id: "C-10442", status: "delivered",
        items: [{ name: "Wireless headphones", quantity: 1, price: 49.99 }],
        total: 49.99, currency: "USD", order_date: daysAgo(9), delivery_date: daysAgo(5), refunded_amount: 0,
    },
    // John: outside the refund window, already partly refunded.
    {
        order_id: "O-88001", customer_id: "C-10443", status: "delivered",
        items: [{ name: "Desk lamp", quantity: 2, price: 60.0 }],
        total: 120.0, currency: "USD", order_date: daysAgo(52), delivery_date: daysAgo(45), refunded_amount: 0,
    },
    {
        order_id: "O-88002", customer_id: "C-10443", status: "returned",
        items: [{ name: "Running shoes", quantity: 1, price: 89.5 }],
        total: 89.5, currency: "USD", order_date: daysAgo(10), delivery_date: daysAgo(3), refunded_amount: 20.0,
    },
    // The Kims: refundable, pending, cancelled.
    {
        order_id: "O-88300", customer_id: "C-10445", status: "delivered",
        items: [{ name: "Phone case", quantity: 1, price: 35.0 }],
        total: 35.0, currency: "USD", order_date: daysAgo(6), delivery_date: daysAgo(2), refunded_amount: 0,
    },
    {
        order_id: "O-88301", customer_id: "C-10446", status: "pending",
        items: [{ name: "Office chair", quantity: 1, price: 210.0 }],
        total: 210.0, currency: "USD", order_date: daysAgo(1), delivery_date: null, refunded_amount: 0,
    },
    {
        order_id: "O-88302", customer_id: "C-10446", status: "cancelled",
        items: [{ name: "Monitor stand", quantity: 1, price: 42.0 }],
        total: 42.0, currency: "USD", order_date: daysAgo(20), delivery_date: null, refunded_amount: 0,
    },
];

export const refunds: Refund[] = [];

// Customers verified by get_customer in this server session. process_refund
// only accepts a customer_id from this set, so the "verify first" gate is
// enforced by the server, not just by the agent's prompt.
export const verifiedCustomerIds = new Set<string>();

export type HandoffReason =
    | "customer_request"
    | "exceeds_authority"
    | "policy_gap"
    | "identity_unverified"
    | "system_error"
    | "sensitive";

export interface Handoff {
    handoff_id: string;
    reason: HandoffReason;
    customer_id: string | null;
    order_id: string | null;
    refund_amount: number | null;
    created_at: string;
}

// Handoffs queued for human agents in this server session. The full summary is
// also appended to handoffs.jsonl so a human can read it outside the conversation.
export const handoffs: Handoff[] = [];
