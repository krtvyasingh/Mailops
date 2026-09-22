/**
 * Module: Team Handoff Protocol & Summary Generator
 *
 * Packages full conversation context, customer sentiment, and open tasks
 * into a structured internal handoff card when transferring tickets to colleagues.
 */
export function createHandoffPacket(threadId, fromAgentId, toAgentId, customerEmail, summaryNote, openActionItems, customerSentiment = 'neutral') {
    return {
        threadId,
        fromAgentId,
        toAgentId,
        customerEmail,
        summaryNote,
        openActionItems,
        customerSentiment,
        timestamp: Date.now()
    };
}
