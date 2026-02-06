/**
 * Discord Webhook Service - Kill Switch Alerts
 * 
 * Redis-throttled Discord notifications for security events.
 * Mẹ Thư's custom messages - "Đừng có lươn lẹo với bà Thư" 🔥
 */

import axios from 'axios';
import redis from '../config/redis';
import env from '../config/env';

// Throttle TTL (seconds) - prevent Discord spam
const THROTTLE_TTL = 10;

// Discord Embed Colors
const COLORS = {
    BLOOD_RED: 0xFF0000,      // Token Reuse - Màu máu hacker
    THANOS_PURPLE: 0x9B59B6,  // Admin Ban - Màu tím quyền lực
    WARNING_ORANGE: 0xE67E22  // Password Changed - Màu cam cảnh báo
};

export type AlertType = 'TOKEN_REUSE' | 'ADMIN_BAN' | 'PASSWORD_CHANGED';

interface AlertData {
    userId: string;
    userType: string;
    userName?: string;
    adminEmail?: string;
    pharmacyName?: string;
}

/**
 * Send Discord alert with Redis throttling
 * Returns true if sent, false if throttled or failed
 */
export async function sendDiscordAlert(type: AlertType, data: AlertData): Promise<boolean> {
    const webhookUrl = env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('[Discord] Webhook URL not configured, skipping alert');
        return false;
    }

    // Check throttle
    const throttleKey = `discord:throttle:${type}:${data.userId}`;
    const isThrottled = await redis.get(throttleKey);

    if (isThrottled) {
        console.log(`[Discord] Throttled alert for ${type}:${data.userId}`);
        return false;
    }

    // Build embed based on type
    const embed = buildEmbed(type, data);

    try {
        await axios.post(webhookUrl, { embeds: [embed] }, {
            headers: { 'Content-Type': 'application/json' }
        });

        // Set throttle key
        await redis.setex(throttleKey, THROTTLE_TTL, '1');

        console.log(`[Discord] ✅ Alert sent: ${type} for user ${data.userId}`);
        return true;
    } catch (error) {
        console.error('[Discord] ❌ Failed to send alert:', error);
        return false;
    }
}

function buildEmbed(type: AlertType, data: AlertData) {
    const timestamp = new Date().toISOString();

    switch (type) {
        case 'TOKEN_REUSE':
            return {
                title: '🚨 SECURITY BREACH DETECTED',
                description: "Á à, có khứa định dùng token cũ để hack mẹ thiên hạ hả con? Đã 'tru di tam tộc' toàn bộ session của khứa này. Cút!",
                color: COLORS.BLOOD_RED,
                fields: [
                    { name: '👤 User ID', value: data.userId, inline: true },
                    { name: '🎭 User Type', value: data.userType, inline: true },
                    { name: '⏰ Time', value: timestamp, inline: true }
                ],
                footer: { text: "MediMaster Anti-Hack • Đừng có lươn lẹo với bà Thư" }
            };

        case 'ADMIN_BAN':
            return {
                title: '⚡ GOD MODE: USER BANNED',
                description: `BÚNG TAY! Admin đã thực thi 'Công lý của Nữ hoàng'. Tài khoản **${data.userName || data.userId}** chính thức bay màu khỏi trái đất. Chúc may mắn lần sau!`,
                color: COLORS.THANOS_PURPLE,
                fields: [
                    { name: '👤 Banned User', value: data.userId, inline: true },
                    { name: '🎭 User Type', value: data.userType, inline: true },
                    { name: '🔐 Admin', value: data.adminEmail || 'System Admin', inline: true },
                    ...(data.pharmacyName ? [{ name: '📍 Pharmacy', value: data.pharmacyName, inline: true }] : [])
                ],
                footer: { text: "The God's Hand • Quyền sinh sát nằm trong tay bà" }
            };

        case 'PASSWORD_CHANGED':
            return {
                title: '🔑 PASSWORD CHANGED',
                description: "Chủ nhà đã đổi chìa khóa. Mấy cái chìa cũ (tokens) giờ thành đống sắt vụn hết rồi. Logout sạch sẽ cho mẹ!",
                color: COLORS.WARNING_ORANGE,
                fields: [
                    { name: '👤 User', value: data.userId, inline: true },
                    { name: '🎭 Type', value: data.userType, inline: true },
                    { name: '⏰ Time', value: timestamp, inline: true }
                ],
                footer: { text: "MediMaster Security • Chìa khóa mới, đời phơi phới" }
            };
    }
}
