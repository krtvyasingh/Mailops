/**
 * Module: Team Handoff Protocol & Summary Generator
 * 
 * Packages full conversation context, customer sentiment, and open tasks
 * into a structured internal handoff card when transferring tickets to colleagues.
 */

export interface HandoffPayload {
  threadId: string;
  fromAgentId: string;
  toAgentId: string;
  customerEmail: string;
  summaryNote: string;
  openActionItems: string[];
  customerSentiment: string;
  timestamp: number;
}

export function createHandoffPacket(
  threadId: string,
  fromAgentId: string,
  toAgentId: string,
  customerEmail: string,
  summaryNote: string,
  openActionItems: string[],
  customerSentiment = 'neutral'
): HandoffPayload {
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
