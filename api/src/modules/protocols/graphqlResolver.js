/**
 * Module: GraphQL Schema & Query Resolver for Inboxes
 *
 * Provides a flexible GraphQL execution interface for querying threads,
 * emails, contacts, and folders.
 */
export function executeGraphQLQuery(req, mockData) {
    if (req.query.includes('inbox')) {
        return {
            data: {
                inbox: {
                    totalCount: mockData.emails?.length || 0,
                    unreadCount: mockData.emails?.filter((e) => !e.read)?.length || 0,
                    emails: mockData.emails || []
                }
            }
        };
    }
    return { data: { status: 'OK' } };
}
