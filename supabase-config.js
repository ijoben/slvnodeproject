// ============================================================
// SUPABASE CONFIGURATION - UNIVERSAL
// ============================================================

// ============================================================
// 1. SUPABASE CREDENTIALS (GANTI DENGAN DATA ANDA)
// ============================================================
const SUPABASE_URL = 'https://xrbriasgmxjzvbukslat.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gSWYSM5dC7BQllHs9AkAGg_aX00RVRI';

// ============================================================
// 2. ADMIN EMAIL (TIDAK MUNCUL DI HTML)
// ============================================================
const ADMIN_EMAIL = 'admin@silverchain.io';

// ============================================================
// 3. INISIALISASI SUPABASE
// ============================================================
let supabaseClient = null;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client created!');
} catch (err) {
    console.error('❌ Supabase error:', err);
}

// ============================================================
// 4. HELPER FUNCTIONS
// ============================================================
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskEmail(email) {
    if (!email) return '-';
    const parts = email.split('@');
    const name = parts[0] || '';
    const domain = parts[1] || '';
    if (name.length <= 2) return name + '@' + domain;
    return name.substring(0, 2) + '***@' + domain;
}

function formatCurrency(num) {
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(2) + 'K';
    return '$' + num.toFixed(0);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(0);
}

async function hashPassword(password) {
    return btoa(password + 'silverchain_salt_2026');
}

async function verifyPassword(password, hashed) {
    return hashed === btoa(password + 'silverchain_salt_2026');
}

// ============================================================
// 5. USER FUNCTIONS
// ============================================================

// Register user
async function registerUser(email, password, referredBy = null) {
    try {
        const existing = await getUserByEmail(email);
        if (existing) throw new Error('Email already registered');

        const hashedPassword = await hashPassword(password);
        const refCode = email.split('@')[0].toUpperCase() + Math.floor(100 + Math.random() * 900);

        const { data, error } = await supabaseClient
            .from('users')
            .insert({
                email: email,
                password: hashedPassword,
                ref_code: refCode,
                referred_by: referredBy,
                verified: true,
                role: 'user'
            })
            .select()
            .single();

        if (error) throw error;
        console.log('✅ User registered:', email);
        return data;
    } catch (error) {
        console.error('❌ Register error:', error);
        throw error;
    }
}

// Login user
async function loginUser(email, password) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) throw new Error('Email not found');
        if (!data) throw new Error('User not found');

        const isValid = await verifyPassword(password, data.password);
        if (!isValid) throw new Error('Invalid password');

        return data;
    } catch (error) {
        console.error('❌ Login error:', error);
        throw error;
    }
}

// Get user by email
async function getUserByEmail(email) {
    try {
        const { data, error } = await supabaseClient
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

// Get user by ID
async function getUserById(id) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Get user by ID error:', error);
        return null;
    }
}

// Get all users (admin only)
async function getAllUsers() {
    try {
        const { data, error } = await supabaseClient
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

        const { error } = await supabaseClient
            .from('users')
            .update({ 
                password: hashedPassword, 
                updated_at: new Date().toISOString() 
            })
            .eq('email', email);

        if (error) throw error;
        console.log('✅ Password updated for:', email);
        return true;
    } catch (error) {
        console.error('❌ Update password error:', error);
        throw error;
    }
}

// Verify user
async function verifyUser(email) {
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ 
                verified: true, 
                updated_at: new Date().toISOString() 
            })
            .eq('email', email);

        if (error) throw error;
        console.log('✅ User verified:', email);
        return true;
    } catch (error) {
        console.error('❌ Verify user error:', error);
        throw error;
    }
}

// Check if user is admin
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
// 6. DEPOSIT FUNCTIONS
// ============================================================

// Add deposit
async function addDeposit(email, usdt, bonus, total, txHash) {
    try {
        const user = await getUserByEmail(email);
        if (!user) throw new Error('User not found');

        const { data, error } = await supabaseClient
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
        const { data, error } = await supabaseClient
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
        const { data, error } = await supabaseClient
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
        const { error } = await supabaseClient
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
// 7. WITHDRAWAL FUNCTIONS
// ============================================================

// Add withdrawal
async function addWithdrawal(email, amount, address) {
    try {
        const user = await getUserByEmail(email);
        if (!user) throw new Error('User not found');

        const { data, error } = await supabaseClient
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
        const { data, error } = await supabaseClient
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
        const { data, error } = await supabaseClient
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
        const { error } = await supabaseClient
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
// 8. SETTINGS FUNCTIONS
// ============================================================

// Get setting
async function getSetting(key) {
    try {
        const { data, error } = await supabaseClient
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
        const { error } = await supabaseClient
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
// 9. BALANCE FUNCTIONS
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

        const { data: referrals } = await supabaseClient
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

// Get total minted
async function getTotalMinted() {
    try {
        const deposits = await getAllDeposits();
        const approved = deposits.filter(d => d.status === 'approved');
        const total = approved.reduce((sum, d) => sum + d.total, 0);
        return Math.round(total * 100) / 100;
    } catch (error) {
        console.error('❌ Get total minted error:', error);
        return 0;
    }
}

// Get total raised
async function getTotalRaised() {
    try {
        const deposits = await getAllDeposits();
        const approved = deposits.filter(d => d.status === 'approved');
        const total = approved.reduce((sum, d) => sum + d.usdt, 0);
        return Math.round(total * 100) / 100;
    } catch (error) {
        console.error('❌ Get total raised error:', error);
        return 0;
    }
}

// ============================================================
// 10. EXPORT
// ============================================================

// Buat global object
window.Supabase = {
    // Config
    supabase: supabaseClient,
    ADMIN_EMAIL,
    
    // Helper
    generateOTP,
    maskEmail,
    formatCurrency,
    formatNumber,
    hashPassword,
    verifyPassword,
    
    // User
    registerUser,
    loginUser,
    getUserByEmail,
    getUserById,
    getAllUsers,
    updatePassword,
    verifyUser,
    isAdmin,
    
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
    getReferralBalance,
    getTotalMinted,
    getTotalRaised
};

console.log('🟢 Supabase Config loaded successfully!');
console.log('📌 URL:', SUPABASE_URL);
console.log('📌 Admin email hidden');
console.log('📌 All functions ready for all pages!');
