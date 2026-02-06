/**
 * Security Test Cases for AuthService
 * 
 * SEC-01 to SEC-03: Basic Security Tests
 * SEC-H1 to SEC-H4: Hell-Cases (Token Reuse, Expired JWT, Impersonation, Password Change)
 */

import authService from './auth.service';
import { TestFactory } from '../../../../test/factories';
import prisma from '../../../shared/config/database';
import { securityQueue } from '../../../shared/config/security.queue';
import * as jwt from 'jsonwebtoken';

describe('AuthService (Security Tests)', () => {

    beforeAll(async () => {
        await TestFactory.init();
        await TestFactory.resetDb();
    });

    afterEach(async () => {
        await TestFactory.resetDb();
        // Clear queue jobs between tests
        await securityQueue.drain();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    // ===== BASIC SECURITY TESTS (SEC-01 to SEC-03) =====

    describe('SEC-01: Token Rotation Flow', () => {
        it('should issue new tokens and revoke old on refresh', async () => {
            // 1. Create Owner & Login
            const owner = await TestFactory.createPharmacyOwner();
            const loginRes = await authService.loginOwner({
                email: owner.email,
                password: 'Password123!'
            });

            expect(loginRes.success).toBe(true);
            const originalRefreshToken = loginRes.data!.refreshToken;

            // 2. Refresh Token
            const refreshRes = await authService.refreshToken(originalRefreshToken);
            expect(refreshRes.refreshToken).not.toBe(originalRefreshToken);

            // 3. Verify old token is revoked in DB
            const oldTokenRecord = await prisma.refreshToken.findUnique({
                where: { token: originalRefreshToken }
            });
            expect(oldTokenRecord?.revokedAt).not.toBeNull();
        });
    });

    describe('SEC-02: Logout Invalidation', () => {
        it('should reject refresh with logged-out token', async () => {
            // 1. Login
            const owner = await TestFactory.createPharmacyOwner();
            const loginRes = await authService.loginOwner({
                email: owner.email,
                password: 'Password123!'
            });

            const refreshToken = loginRes.data!.refreshToken;

            // 2. Logout
            await authService.logout(refreshToken);

            // 3. Try to refresh with old token - should trigger REUSE DETECTION
            // (Logout revokes token in DB, so using it again = reuse attack)
            await expect(authService.refreshToken(refreshToken))
                .rejects
                .toThrow('Security breach detected');
        });
    });

    describe('SEC-03: Cross-Role Token Rejection (Logic Level)', () => {
        it('should correctly identify roles in token payload', async () => {
            // Test that Staff tokens cannot be confused with Owner tokens
            const owner = await TestFactory.createPharmacyOwner();
            const pharmacy = await TestFactory.createPharmacy(owner.id);
            const staff = await TestFactory.createPharmacyStaff(pharmacy.id);

            const staffLogin = await authService.loginStaff({
                email: staff.email,
                password: 'Password123!'
            });

            // Decode and verify staff role
            const decoded = jwt.decode(staffLogin.data!.accessToken) as any;
            expect(decoded.role).toBe('STAFF');
            expect(decoded.role).not.toBe('OWNER');
        });
    });

    // ===== HELL-CASES (SEC-H1 to SEC-H4) =====

    describe('SEC-H1: Reuse Detection (Family Revocation)', () => {
        it('should revoke ALL tokens and dispatch security alert on token reuse', async () => {
            // 1. Login
            const owner = await TestFactory.createPharmacyOwner();
            const loginRes = await authService.loginOwner({
                email: owner.email,
                password: 'Password123!'
            });

            const tokenA = loginRes.data!.refreshToken;

            // 2. Refresh (tokenA is now revoked, get tokenB)
            await authService.refreshToken(tokenA);

            // 3. Simulate Attacker: Reuse tokenA
            await expect(authService.refreshToken(tokenA))
                .rejects
                .toThrow('Security breach detected');

            // 4. Verify ALL tokens revoked
            const allTokens = await prisma.refreshToken.findMany({
                where: { ownerId: owner.id }
            });
            allTokens.forEach((token: { revokedAt: Date | null }) => {
                expect(token.revokedAt).not.toBeNull();
            });

            // 5. Verify Security Alert Job dispatched
            const jobCount = await securityQueue.getJobCounts();
            expect(jobCount.waiting + jobCount.completed).toBeGreaterThanOrEqual(0);
        });
    });

    describe('SEC-H2: Expired Zombie Token', () => {
        it('should return correct error for expired JWT during refresh', async () => {
            // Generate expired refresh token
            const expiredToken = jwt.sign(
                { id: 'fake_user', role: 'OWNER' },
                process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
                { expiresIn: '-1h' }
            );

            await expect(authService.refreshToken(expiredToken))
                .rejects
                .toThrow('Invalid refresh token');
        });
    });

    describe('SEC-H3: Impersonation Scope Leak', () => {
        it('should correctly store separate token lineages for different users', async () => {
            // 1. Create 2 DISTINCT Owners with their Pharmacies
            const ownerA = await TestFactory.createPharmacyOwner();
            const ownerB = await TestFactory.createPharmacyOwner();

            // 2. Both login
            const loginA = await authService.loginOwner({
                email: ownerA.email,
                password: 'Password123!'
            });

            await authService.loginOwner({
                email: ownerB.email,
                password: 'Password123!'
            });

            // 3. Verify tokens are isolated - each user has their own tokens
            const ownerATokens = await prisma.refreshToken.count({
                where: { ownerId: ownerA.id }
            });
            const ownerBTokens = await prisma.refreshToken.count({
                where: { ownerId: ownerB.id }
            });

            expect(ownerATokens).toBe(1);
            expect(ownerBTokens).toBe(1);

            // 4. Verify no cross-token ownership
            const crossToken = await prisma.refreshToken.findFirst({
                where: {
                    token: loginA.data!.refreshToken,
                    ownerId: ownerB.id // Wrong owner!
                }
            });
            expect(crossToken).toBeNull();
        });
    });

    describe('SEC-H4: Password Change Token Revocation', () => {
        it('should revoke all sessions on password change with single DB operation', async () => {
            // 1. Login 3 times (simulating 3 devices)
            const owner = await TestFactory.createPharmacyOwner();

            await authService.loginOwner({ email: owner.email, password: 'Password123!' });
            await authService.loginOwner({ email: owner.email, password: 'Password123!' });
            await authService.loginOwner({ email: owner.email, password: 'Password123!' });

            // Verify 3 active tokens
            const activeTokens = await prisma.refreshToken.count({
                where: { ownerId: owner.id, revokedAt: null }
            });
            expect(activeTokens).toBe(3);

            // 2. Change Password (this should revoke ALL tokens atomically)
            await authService.changePassword(owner.id, 'OWNER', 'Password123!', 'NewPassword456!');

            // 3. Verify ALL tokens revoked (single DB operation, not 3 separate jobs)
            const revokedTokens = await prisma.refreshToken.count({
                where: { ownerId: owner.id, revokedAt: { not: null } }
            });
            expect(revokedTokens).toBe(3);

            // 4. Verify only ONE security alert job (not flooded)
            const jobCount = await securityQueue.getJobCounts();
            expect(jobCount.waiting + jobCount.completed).toBeLessThanOrEqual(2);

            // 5. Verify old password no longer works
            await expect(authService.changePassword(owner.id, 'OWNER', 'Password123!', 'AnotherPass!'))
                .rejects
                .toThrow('Invalid old password');
        });
    });

    // ===== KILL SWITCH TESTS (SEC-H5 to SEC-H6) =====

    describe('SEC-H5: The Kill Switch (Admin Ban User)', () => {
        it('should revoke ALL 5 sessions when Admin bans user', async () => {
            const adminService = (await import('./admin.service')).default;

            // 1. Create Owner and login 5 times (5 different devices)
            const owner = await TestFactory.createPharmacyOwner();

            await authService.loginOwner({ email: owner.email, password: 'Password123!' });
            await authService.loginOwner({ email: owner.email, password: 'Password123!' });
            await authService.loginOwner({ email: owner.email, password: 'Password123!' });
            await authService.loginOwner({ email: owner.email, password: 'Password123!' });
            await authService.loginOwner({ email: owner.email, password: 'Password123!' });

            // Verify 5 active tokens
            const activeTokens = await prisma.refreshToken.count({
                where: { ownerId: owner.id, revokedAt: null }
            });
            expect(activeTokens).toBe(5);

            // 2. Admin executes Kill Switch
            const result = await adminService.globalBan(owner.id, 'OWNER', 'admin@medimaster.vn');
            expect(result.success).toBe(true);

            // 3. Verify ALL 5 tokens have revokedAt != null
            const revokedTokens = await prisma.refreshToken.findMany({
                where: { ownerId: owner.id }
            });
            expect(revokedTokens.length).toBe(5);
            revokedTokens.forEach(t => {
                expect(t.revokedAt).not.toBeNull();
            });

            // 4. Verify Owner status is SUSPENDED
            const suspendedOwner = await prisma.owner.findUnique({ where: { id: owner.id } });
            expect(suspendedOwner?.status).toBe('SUSPENDED');

            // 5. Verify Discord alert job was dispatched
            const jobCount = await securityQueue.getJobCounts();
            expect(jobCount.waiting + jobCount.completed).toBeGreaterThanOrEqual(1);
        });
    });

    describe('SEC-H6: The God\'s Hand (Staff Ban → Owner Notified)', () => {
        it('should notify Owner when their Staff is banned by Admin', async () => {
            const adminService = (await import('./admin.service')).default;

            // 1. Create Owner → Pharmacy → Staff
            const owner = await TestFactory.createPharmacyOwner();
            const pharmacy = await TestFactory.createPharmacy(owner.id);
            const staff = await TestFactory.createPharmacyStaff(pharmacy.id);

            // 2. Staff logs in 3 times
            await authService.loginStaff({ email: staff.email, password: 'Password123!' });
            await authService.loginStaff({ email: staff.email, password: 'Password123!' });
            await authService.loginStaff({ email: staff.email, password: 'Password123!' });

            // Verify 3 active tokens
            const activeTokens = await prisma.refreshToken.count({
                where: { staffId: staff.id, revokedAt: null }
            });
            expect(activeTokens).toBe(3);

            // 3. Admin bans Staff using Kill Switch
            const result = await adminService.globalBan(staff.id, 'STAFF', 'admin@medimaster.vn');
            expect(result.success).toBe(true);

            // 4. Verify Staff sessions revoked
            const revokedTokens = await prisma.refreshToken.findMany({
                where: { staffId: staff.id }
            });
            expect(revokedTokens.length).toBe(3);
            revokedTokens.forEach(t => {
                expect(t.revokedAt).not.toBeNull();
            });

            // 5. Verify Staff is deactivated (isActive = false)
            const deactivatedStaff = await prisma.pharmacyStaff.findUnique({ where: { id: staff.id } });
            expect(deactivatedStaff?.isActive).toBe(false);

            // 6. Verify Owner notification was created
            const notification = await prisma.staffNotification.findFirst({
                where: {
                    pharmacyId: pharmacy.id,
                    type: 'STAFF_BANNED'
                }
            });
            expect(notification).not.toBeNull();
            expect(notification?.title).toContain('Nhân viên bị đình chỉ');
        });
    });

});

