// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

// Ganti dengan URL dan Key dari Supabase (STEP 3)
const SUPABASE_URL = 'https://xxxxxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Inisialisasi Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// AUTH FUNCTIONS
// ============================================================

// Hash password (simple - untuk demo)
async function hashPassword(password) {
    return btoa(password + 'silverchain_salt');
}

async function verifyPassword(password, hashed) {
    return hashed === btoa(password + 'silverchain_salt');
}

// Register user
async function registerUser(email, password, referredBy = null) {
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
    return data;
}

// Login user
async function loginUser(email, password) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    if (error) throw new Error('Email not found');
    if (!data) throw new Error('User not found');
    
    const isValid = await verifyPassword(password, data.password);
    if (!isValid) throw new Error('Invalid password');
    
    if (!data.verified) throw new Error('Email not verified');
    
    return data;
}

// Get user by email
async function getUserByEmail(email) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

// Get all users (admin only)
async function getAllUsers() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

// Update password
async function updatePassword(email, newPassword) {
    const hashedPassword = await hashPassword(newPassword);
    
    const { error } = await supabase
        .from('users')
        .update({ password: hashedPassword, updated_at: new Date().toISOString() })
        .eq('email', email);
    
    if (error) throw error;
    return true;
}

// Verify user
async function verifyUser(email) {
    const { error } = await supabase
        .from('users')
        .update({ verified: true, updated_at: new Date().toISOString() })
        .eq('email', email);
    
    if (error) throw error;
    return true;
}

// ============================================================
// OTP FUNCTIONS
// ============================================================

// Save OTP
async function saveOTP(email, otp, type = 'register') {
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
    return true;
}

// Verify OTP
async function verifyOTP(email, otp, type = 'register') {
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
    
    await supabase
        .from('otp_codes')
        .update({ used: true })
        .eq('id', data.id);
    
    return true;
}

// Resend OTP
async function resendOTP(email, type = 'register') {
    await supabase
        .from('otp_codes')
        .delete()
        .eq('email', email)
        .eq('type', type)
        .eq('used', false);
    
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOTP(email, newOtp, type);
    return newOtp;
}

// ============================================================
// DEPOSIT FUNCTIONS
// ============================================================

// Add deposit
async function addDeposit(email, usdt, bonus, total, txHash) {
    const user = await getUserByEmail(email);
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
        .from('deposits')
        .insert({
            user_id: user.id,
            email: email,
            usdt: usdt,
            bonus: bonus,
            total: total,
            tx_hash: txHash,
            status: 'pending',
            timestamp: Date.now()
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Get user deposits
async function getUserDeposits(email) {
    const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('email', email)
        .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
}

// Get all deposits (admin)
async function getAllDeposits() {
    const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
}

// Update deposit status
async function updateDepositStatus(id, status) {
    const { error } = await supabase
        .from('deposits')
        .update({ status: status })
        .eq('id', id);
    
    if (error) throw error;
    return true;
}

// ============================================================
// WITHDRAWAL FUNCTIONS
// ============================================================

// Add withdrawal
async function addWithdrawal(email, amount, address) {
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
    return data;
}

// Get user withdrawals
async function getUserWithdrawals(email) {
    const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('email', email)
        .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
}

// Get all withdrawals (admin)
async function getAllWithdrawals() {
    const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
}

// Update withdrawal status
async function updateWithdrawalStatus(id, status) {
    const { error } = await supabase
        .from('withdrawals')
        .update({ status: status })
        .eq('id', id);
    
    if (error) throw error;
    return true;
}

// ============================================================
// SETTINGS FUNCTIONS
// ============================================================

// Get setting
async function getSetting(key) {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? data.value : null;
}

// Save setting
async function saveSetting(key, value) {
    const { error } = await supabase
        .from('settings')
        .upsert({
            key: key,
            value: value,
            updated_at: new Date().toISOString()
        });
    
    if (error) throw error;
    return true;
}

// ============================================================
// CALCULATE FUNCTIONS
// ============================================================

// Calculate personal balance
async function getPersonalBalance(email) {
    const deposits = await getUserDeposits(email);
    const approved = deposits.filter(d => d.status === 'approved');
    return approved.reduce((sum, d) => sum + d.usdt + (d.bonus || 0), 0);
}

// Calculate referral balance
async function getReferralBalance(email) {
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
        const firstDeposit = deposits.filter(d => d.status === 'approved')
            .sort((a, b) => a.timestamp - b.timestamp)[0];
        if (firstDeposit) {
            total += firstDeposit.usdt * refPercent / 100;
        }
    }
    
    const withdrawals = await getUserWithdrawals(email);
    const totalWd = withdrawals.filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + w.amount, 0);
    
    return Math.round((total - totalWd) * 100) / 100;
}

// ============================================================
// EXPORT
// ============================================================

window.Supabase = {
    supabase,
    registerUser,
    loginUser,
    getUserByEmail,
    getAllUsers,
    updatePassword,
    verifyUser,
    saveOTP,
    verifyOTP,
    resendOTP,
    addDeposit,
    getUserDeposits,
    getAllDeposits,
    updateDepositStatus,
    addWithdrawal,
    getUserWithdrawals,
    getAllWithdrawals,
    updateWithdrawalStatus,
    getSetting,
    saveSetting,
    getPersonalBalance,
    getReferralBalance
};

console.log('🟢 Supabase Config loaded');
console.log('📌 URL:', SUPABASE_URL);
