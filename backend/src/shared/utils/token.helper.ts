export class TokenHelper {
    static extractUserId(payload: any): string {
        return payload.id || payload.sub;
    }

    static extractUserRole(payload: any): string {
        return payload.role;
    }
}
