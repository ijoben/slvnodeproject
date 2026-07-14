// ============================================================
// SUPABASE + EMAILJS CONFIGURATION
// ============================================================

// ============================================================
// 1. SUPABASE CREDENTIALS (GANTI DENGAN DATA ANDA)
// ============================================================
const SUPABASE_URL = 'https://xrbriasgmxjzvbukslat.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gSWYSM5dC7BQllHs9AkAGg_aX00RVRI';

// ============================================================
// 2. EMAILJS CONFIGURATION (GANTI DENGAN DATA ANDA)
// ============================================================
const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'w5jTLQ2WIHCXIUZ05',           // Dari EmailJS → Account → Public Key
    SERVICE_ID: 'service_4sx87eg',       // Dari EmailJS → Email Services
    OTP_TEMPLATE_ID: 'template_hytrffr',   // Dari EmailJS → Template OTP
    RESET_TEMPLATE_ID: 'template_clznrkh'  // Dari EmailJS → Template Reset
};

// ============================================================
// 3. INISIALISASI SUPABASE
// ============================================================
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// 4. INISIALISASI EMAILJS
// ============================================================
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
    console.log('✅ EmailJS initialized');
}

// ============================================================
// 5. HELPER FUNCTIONS
// ============================================================

// Hash password (simple - untuk demo)
async function hashPassword(password) {
    return btoa(password + 'silverchain_salt_2026');
}

async function verifyPassword(password, hashed) {
    return hashed === btoa(password + 'silverchain_salt_2026');
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================================
// 6. EMAIL FUNCTIONS (Via EmailJS)
// ============================================================

// Send OTP email
async function sendOTPEmail(email, otp) {
    try {
        if (typeof emailjs === 'undefined') {
            console.log('📧 [FALLBACK] OTP for', email, ':', otp);
            return { success: true, fallback: true };
        }

        const templateParams = {
            to_email: email,
            otp_code: otp
        };

        const result = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.OTP_TEMPLATE_ID,
            templateParams
        );

        console.log('✅ OTP email sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('❌ EmailJS error:', error);
        console.log('📧 [FALLBACK] OTP for', email, ':', otp);
        return { success: true, fallback: true };
    }
}

// Send Reset Password email
async function sendResetEmail(email, resetLink) {
    try {
        if (typeof emailjs === 'undefined') {
            console.log('🔑 [FALLBACK] Reset link for', email, ':', resetLink);
            return { success: true, fallback: true };
        }

        const templateParams = {
            to_email: email,
            reset_link: resetLink
        };

        const result = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.RESET_TEMPLATE_ID,
            templateParams
        );

        console.log('✅ Reset email sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('❌ EmailJS error:', error);
        console.log('🔑 [FALLBACK] Reset link for', email, ':', resetLink);
        return { success: true, fallback: true };
    }
}

// ============================================================
// 7. USER FUNCTIONS
// ============================================================

// Register user (pending verification)
async function registerUser(email, password, referredBy = null) {
    try {
        const existing = await getUserByEmail(email);
        if (existing) throw new Error('Email already registered');

        const hashedPassword = await hashPassword(password);
        const refCode = email.split('@')[0].toUpperCase() + Math.floor(100 + Math.random() * 900);

        const { data, error } = await supabase
            .from('users')
            .insert({
                email: email,
                password: hashedPassword,
                ref_code: refCode,
                referred_by: referredBy,
                verified: false,
                role: 'user'
            })
            .select()
            .single();

        if (error) throw error;
        console.log('✅ User registered (pending verification):', email);
        return data;
    } catch (error) {
        console.error('❌ Register error:', error);
        throw error;
    }
}

// Login user
async function loginUser(email, password) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) throw new Error('Email not found');
        if (!data) throw new Error('User not found');

        const isValid = await verifyPassword(password, data.password);
        if (!isValid) throw new Error('Invalid password');

        if (!data.verified) throw new Error('Email not verified. Please verify your email first.');

        return data;
    } catch (error) {
        console.error('❌ Login error:', error);
        throw error;
    }
}

// Get user by email
async function getUserByEmail(email) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Get user error:', error);
        return null;
    }
}

// Get all users (admin only)
async function getAllUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Get all users error:', error);
        return [];
    }
}

// Update password
async function updatePassword(email, newPassword) {
    try {
        const hashedPassword = await hashPassword(newPassword);

        const { error } = await supabase
            .from('users')
            .update({ password: hashedPassword, updated_at: new Date().toISOString() })
            .eq('email', email);

        if (error) throw error;
        console.log('✅ Password updated for:', email);
        return true;
    } catch (error) {
        console.error('❌ Update password error:', error);
        throw error;
    }
}

// Verify user (set verified = true)
async function verifyUser(email) {
    try {
        const { error } = await supabase
            .from('users')
            .update({ verified: true, updated_at: new Date().toISOString() })
            .eq('email', email);

        if (error) throw error;
        console.log('✅ User verified:', email);
        return true;
    } catch (error) {
        console.error('❌ Verify user error:', error);
        throw error;
    }
}

// ============================================================
// 8. OTP FUNCTIONS
// ============================================================

// Save OTP to database
async function saveOTP(email, otp, type = 'register') {
    try {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const { error } = await supabase
            .from('otp_codes')
            .insert({
                email: email,
                otp: otp,
                type: type,
                expires_at: expiresAt.toISOString(),
                used: false
            });

        if (error) throw error;
        console.log('✅ OTP saved for:', email);
        return true;
    } catch (error) {
        console.error('❌ Save OTP error:', error);
        throw error;
    }
}

// Verify OTP
async function verifyOTP(email, otp, type = 'register') {
    try {
        const { data, error } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .eq('type', type)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) throw new Error('Invalid or expired OTP');
        if (!data) throw new Error('Invalid or expired OTP');

        // Mark OTP as used
        const { error: updateError } = await supabase
            .from('otp_codes')
            .update({ used: true })
            .eq('id', data.id);

        if (updateError) throw updateError;

        console.log('✅ OTP verified for:', email);
        return true;
    } catch (error) {
        console.error('❌ Verify OTP error:', error);
        throw error;
    }
}

// Resend OTP
async function resendOTP(email, type = 'register') {
    try {
        // Delete old OTP
        await supabase
            .from('otp_codes')
            .delete()
            .eq('email', email)
            .eq('type', type)
            .eq('used', false);

        const newOtp = generateOTP();
        await saveOTP(email, newOtp, type);

        console.log('✅ OTP resent for:', email);
        return newOtp;
    } catch (error) {
        console.error('❌ Resend OTP error:', error);
        throw error;
    }
}

// ============================================================
// 9. DEPOSIT FUNCTIONS
// ============================================================

// Add deposit
async function addDeposit(email, usdt, bonus, total, txHash) {
    try {
        const user = await getUserByEmail(email);
        if (!user) throw new Error('User not found');

        const { data, error } = await supabase
            .from('deposits')
            .insert({
                user_id: user.id,
                email: email,
                usdt: usdt,
                bonus: bonus || 0,
                total: total || usdt,
                tx_hash: txHash,
                status: 'pending',
                timestamp: Date.now()
            })
            .select()
            .single();

        if (error) throw error;
        console.log('✅ Deposit added for:', email);
        return data;
    } catch (error) {
        console.error('❌ Add deposit error:', error);
        throw error;
    }
}

// Get user deposits
async function getUserDeposits(email) {
    try {
        const { data, error } = await supabase
            .from('deposits')
            .select('*')
            .eq('email', email)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Get user deposits error:', error);
        return [];
    }
}

// Get all deposits (admin)
async function getAllDeposits() {
    try {
        const { data, error } = await supabase
            .from('deposits')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Get all deposits error:', error);
        return [];
    }
}

// Update deposit status
async function updateDepositStatus(id, status) {
    try {
        const { error } = await supabase
            .from('deposits')
            .update({ status: status })
            .eq('id', id);

        if (error) throw error;
        console.log('✅ Deposit status updated:', id, '->', status);
        return true;
    } catch (error) {
        console.error('❌ Update deposit status error:', error);
        throw error;
    }
}

// ============================================================
// 10. WITHDRAWAL FUNCTIONS
// ============================================================

// Add withdrawal
async function addWithdrawal(email, amount, address) {
    try {
        const user = await getUserByEmail(email);
        if (!user) throw new Error('User not found');

        const { data, error } = await supabase
            .from('withdrawals')
            .insert({
                user_id: user.id,
                email: email,
                amount: amount,
                address: address,
                status: 'pending',
                timestamp: Date.now()
            })
            .select()
            .single();

        if (error) throw error;
        console.log('✅ Withdrawal added for:', email);
        return data;
    } catch (error) {
        console.error('❌ Add withdrawal error:', error);
        throw error;
    }
}

// Get user withdrawals
async function getUserWithdrawals(email) {
    try {
        const { data, error } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('email', email)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Get user withdrawals error:', error);
        return [];
    }
}

// Get all withdrawals (admin)
async function getAllWithdrawals() {
    try {
        const { data, error } = await supabase
            .from('withdrawals')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Get all withdrawals error:', error);
        return [];
    }
}

// Update withdrawal status
async function updateWithdrawalStatus(id, status) {
    try {
        const { error } = await supabase
            .from('withdrawals')
            .update({ status: status })
            .eq('id', id);

        if (error) throw error;
        console.log('✅ Withdrawal status updated:', id, '->', status);
        return true;
    } catch (error) {
        console.error('❌ Update withdrawal status error:', error);
        throw error;
    }
}

// ============================================================
// 11. SETTINGS FUNCTIONS
// ============================================================

// Get setting
async function getSetting(key) {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data ? data.value : null;
    } catch (error) {
        console.error('❌ Get setting error:', error);
        return null;
    }
}

// Save setting
async function saveSetting(key, value) {
    try {
        const { error } = await supabase
            .from('settings')
            .upsert({
                key: key,
                value: value,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
        console.log('✅ Setting saved:', key, '=', value);
        return true;
    } catch (error) {
        console.error('❌ Save setting error:', error);
        throw error;
    }
}

// ============================================================
// 12. BALANCE FUNCTIONS
// ============================================================

// Get personal balance
async function getPersonalBalance(email) {
    try {
        const deposits = await getUserDeposits(email);
        const approved = deposits.filter(d => d.status === 'approved');
        const total = approved.reduce((sum, d) => sum + d.usdt + (d.bonus || 0), 0);
        return Math.round(total * 100) / 100;
    } catch (error) {
        console.error('❌ Get personal balance error:', error);
        return 0;
    }
}

// Get referral balance
async function getReferralBalance(email) {
    try {
        const user = await getUserByEmail(email);
        if (!user) return 0;

        const { data: referrals } = await supabase
            .from('users')
            .select('email')
            .eq('referred_by', user.ref_code);

        const refPercent = parseInt(await getSetting('ref_percent')) || 3;
        let total = 0;

        for (const ref of referrals) {
            const deposits = await getUserDeposits(ref.email);
            const firstDeposit = deposits
                .filter(d => d.status === 'approved')
                .sort((a, b) => a.timestamp - b.timestamp)[0];

            if (firstDeposit) {
                total += firstDeposit.usdt * refPercent / 100;
            }
        }

        const withdrawals = await getUserWithdrawals(email);
        const totalWd = withdrawals
            .filter(w => w.status === 'approved')
            .reduce((sum, w) => sum + w.amount, 0);

        return Math.round((total - totalWd) * 100) / 100;
    } catch (error) {
        console.error('❌ Get referral balance error:', error);
        return 0;
    }
}

// ============================================================
// 13. ADMIN CHECK
// ============================================================

async function isAdmin(email) {
    try {
        const user = await getUserByEmail(email);
        return user && user.role === 'admin';
    } catch (error) {
        console.error('❌ Check admin error:', error);
        return false;
    }
}

// ============================================================
// 14. EXPORT
// ============================================================

window.Supabase = {
    // Config
    supabase,
    EMAILJS_CONFIG,

    // Email
    sendOTPEmail,
    sendResetEmail,

    // User
    registerUser,
    loginUser,
    getUserByEmail,
    getAllUsers,
    updatePassword,
    verifyUser,
    isAdmin,

    // OTP
    saveOTP,
    verifyOTP,
    resendOTP,
    generateOTP,

    // Deposit
    addDeposit,
    getUserDeposits,
    getAllDeposits,
    updateDepositStatus,

    // Withdrawal
    addWithdrawal,
    getUserWithdrawals,
    getAllWithdrawals,
    updateWithdrawalStatus,

    // Settings
    getSetting,
    saveSetting,

    // Balance
    getPersonalBalance,
    getReferralBalance
};

console.log('🟢 Supabase Config loaded successfully!');
console.log('📌 Supabase URL:', SUPABASE_URL);
console.log('📌 EmailJS Public Key:', EMAILJS_CONFIG.PUBLIC_KEY ? '✅ Set' : '❌ Not set');
console.log('📌 EmailJS Service ID:', EMAILJS_CONFIG.SERVICE_ID ? '✅ Set' : '❌ Not set');
console.log('📌 EmailJS OTP Template:', EMAILJS_CONFIG.OTP_TEMPLATE_ID ? '✅ Set' : '❌ Not set');
console.log('📌 EmailJS Reset Template:', EMAILJS_CONFIG.RESET_TEMPLATE_ID ? '✅ Set' : '❌ Not set');
