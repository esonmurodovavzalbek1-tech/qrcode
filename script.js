// ========== SECURITY CONSTANTS ==========
const MAX_URL_LENGTH = 2953; // QR code limit
const MAX_HISTORY_SIZE = 50;
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_STORAGE_SIZE = 5242880; // 5MB

// ========== RATE LIMITING ==========
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    isAllowed() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }
        return false;
    }
}

const generateRateLimiter = new RateLimiter(MAX_REQUESTS_PER_WINDOW, RATE_LIMIT_WINDOW);

// ========== DOM ELEMENTS ==========
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const shareBtn = document.getElementById('shareBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const exportHistoryBtn = document.getElementById('exportHistoryBtn');
const themeToggle = document.getElementById('themeToggle');
const settingsBtn = document.getElementById('settingsBtn');
const clearInputBtn = document.getElementById('clearInputBtn');

// Input elements
const urlInput = document.getElementById('urlInput');
const searchHistory = document.getElementById('searchHistory');
const errorDiv = document.getElementById('error');
const notification = document.getElementById('notification');

// QR settings
const qrSettings = document.getElementById('qrSettings');
const qrSize = document.getElementById('qrSize');
const sizeValue = document.getElementById('sizeValue');
const errorCorrection = document.getElementById('errorCorrection');

// Containers
const qrcodeDiv = document.getElementById('qrcode');
const historyList = document.getElementById('historyList');
const qrActions = document.getElementById('qrActions');

// Constants
const STORAGE_KEY = 'qrcode_history';
const THEME_KEY = 'theme_mode';
const ENCRYPTION_KEY = 'qr_secure_storage';

// State
let currentQRCode = null;
let currentURL = null;
let currentQRSize = 250;
let currentCorrectLevel = 'H';
let filteredHistory = [];
let isMobile = false;

// ========== SECURITY: INPUT SANITIZATION ==========
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    // Remove null bytes
    input = input.replace(/\0/g, '');
    
    // Limit length
    if (input.length > MAX_URL_LENGTH) {
        input = input.substring(0, MAX_URL_LENGTH);
    }
    
    // Remove dangerous characters
    input = input.replace(/[<>\"']/g, '');
    
    return input.trim();
}

// ========== SECURITY: HTML ESCAPE ==========
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>\"']/g, m => map[m]);
}

// ========== SECURITY: DATA ENCRYPTION (SIMPLE) ==========
function encryptData(data) {
    try {
        const jsonStr = JSON.stringify(data);
        return btoa(jsonStr); // Base64 encoding (basic protection)
    } catch (e) {
        console.error('Encryption error:', e);
        return null;
    }
}

function decryptData(encrypted) {
    try {
        if (!encrypted) return null;
        const jsonStr = atob(encrypted);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Decryption error:', e);
        return null;
    }
}

// ========== SECURITY: SECURE STORAGE ==========
function getHistory() {
    try {
        const encrypted = localStorage.getItem(STORAGE_KEY);
        if (!encrypted) return [];
        
        const data = decryptData(encrypted);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Storage read error:', e);
        return [];
    }
}

function saveHistory(history) {
    try {
        // Validate data
        if (!Array.isArray(history)) return;
        
        // Check storage size
        const encrypted = encryptData(history);
        if (!encrypted || encrypted.length > MAX_STORAGE_SIZE) {
            showNotification('Saqlash joyida xatolik!', 'error');
            return;
        }
        
        localStorage.setItem(STORAGE_KEY, encrypted);
    } catch (e) {
        console.error('Storage write error:', e);
        showNotification('Saqlashda xatolik!', 'error');
    }
}

// ========== MOBILE DETECTION ==========
function detectMobile() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        currentQRSize = 200;
        qrSize.value = 200;
        sizeValue.textContent = '200px';
    }
    return isMobile;
}

// ========== SERVICE WORKER REGISTRATION ==========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ========== THEME MANAGEMENT ==========
function initTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    } catch (e) {
        console.error('Theme init error:', e);
    }
}

themeToggle.addEventListener('click', function() {
    try {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    } catch (e) {
        console.error('Theme toggle error:', e);
    }
});

// ========== VALIDATION ==========
function isValidURL(string) {
    try {
        // Sanitize first
        string = sanitizeInput(string);
        
        if (!string || string.length === 0) return false;
        if (string.length > MAX_URL_LENGTH) return false;
        
        // Check for dangerous protocols
        if (/^(javascript|data|vbscript):/i.test(string)) {
            return false;
        }
        
        const url = new URL(string);
        
        // Only allow http and https
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return false;
        }
        
        return true;
    } catch (_) {
        return false;
    }
}

// ========== NOTIFICATION ==========
function showNotification(message, type = 'success') {
    try {
        // Sanitize message
        message = escapeHtml(String(message).substring(0, 200));
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    } catch (e) {
        console.error('Notification error:', e);
    }
}

// ========== QR CODE GENERATION ==========
function generateQRCode(url) {
    // Rate limiting
    if (!generateRateLimiter.isAllowed()) {
        showNotification('Juda tez! Kutib turing.', 'error');
        return;
    }

    // Show loading
    qrcodeDiv.innerHTML = '<div class="loading-spinner"></div>';
    errorDiv.textContent = '';
    qrActions.style.display = 'none';

    // Sanitize input
    url = sanitizeInput(url);

    // Validate URL
    if (!url) {
        errorDiv.textContent = 'Iltimos, URL ni kiriting!';
        qrcodeDiv.innerHTML = '';
        return;
    }

    // Format URL
    let formattedURL = url;
    if (!url.match(/^https?:\/\//)) {
        formattedURL = 'https://' + url;
    }

    if (!isValidURL(formattedURL)) {
        errorDiv.textContent = 'Noto\'g\'ri URL format!';
        qrcodeDiv.innerHTML = '';
        return;
    }

    try {
        setTimeout(() => {
            qrcodeDiv.innerHTML = '';
            
            // Get correction level
            const correctionLevels = {
                'L': QRCode.CorrectLevel.L,
                'M': QRCode.CorrectLevel.M,
                'Q': QRCode.CorrectLevel.Q,
                'H': QRCode.CorrectLevel.H
            };

            currentQRCode = new QRCode({
                text: formattedURL,
                width: currentQRSize,
                height: currentQRSize,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: correctionLevels[currentCorrectLevel]
            });

            currentURL = formattedURL;
            qrActions.style.display = 'flex';
            addToHistory(formattedURL);
            showNotification('QR Code muvaffaqiyatli yaratildi!', 'success');
        }, 300);

    } catch (error) {
        console.error('QR generation error:', error);
        errorDiv.textContent = 'Xatolik: ' + escapeHtml(String(error.message).substring(0, 100));
        qrcodeDiv.innerHTML = '';
        qrActions.style.display = 'none';
        showNotification('QR Code yaratishda xatolik!', 'error');
    }
}

// ========== HISTORY MANAGEMENT ==========
function addToHistory(url) {
    try {
        // Validate URL
        url = sanitizeInput(url);
        if (!isValidURL(url)) return;
        
        let history = getHistory();
        
        // Check if already exists
        const exists = history.some(item => 
            item.url === url
        );
        
        if (!exists) {
            history.unshift({
                url: escapeHtml(url),
                timestamp: new Date().toLocaleString('uz-UZ'),
                id: Date.now()
            });

            // Keep max size
            if (history.length > MAX_HISTORY_SIZE) {
                history = history.slice(0, MAX_HISTORY_SIZE);
            }

            saveHistory(history);
        }

        renderHistory();
    } catch (e) {
        console.error('Add to history error:', e);
    }
}

function renderHistory() {
    try {
        const history = getHistory();
        let searchTerm = sanitizeInput(searchHistory.value).toLowerCase();
        
        filteredHistory = history.filter(item => 
            item.url.toLowerCase().includes(searchTerm)
        );

        if (filteredHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-message"><i class="fas fa-folder-open"></i> Saqlangan narsalar yo\'q</p>';
            return;
        }

        historyList.innerHTML = filteredHistory.map(item => `
            <div class="history-item">
                <div class="history-item-url">${escapeHtml(item.url)}</div>
                <div class="history-item-actions">
                    <button class="btn-view" onclick="viewQRCode('${escapeHtml(item.url)}')" title="Ko'rish">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteFromHistory(${item.id})" title="O'chirish">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Render history error:', e);
    }
}

function viewQRCode(url) {
    try {
        url = sanitizeInput(url);
        if (!isValidURL(url)) return;
        
        urlInput.value = url;
        generateQRCode(url);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        console.error('View QR code error:', e);
    }
}

function deleteFromHistory(id) {
    try {
        // Validate ID
        if (typeof id !== 'number' || id <= 0) return;
        
        let history = getHistory();
        history = history.filter(item => item.id !== id);
        saveHistory(history);
        renderHistory();
        showNotification('O\'chirildi', 'success');
    } catch (e) {
        console.error('Delete history error:', e);
    }
}

// ========== FILE OPERATIONS ==========
function downloadQRCode() {
    try {
        if (!currentQRCode) return;

        const canvas = qrcodeDiv.querySelector('canvas');
        if (!canvas) return;

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `qrcode-${Date.now()}.png`;
        link.click();
        
        showNotification('QR Code yuklab olindi!', 'success');
    } catch (e) {
        console.error('Download error:', e);
        showNotification('Yuklab olishda xatolik!', 'error');
    }
}

function copyToClipboard() {
    try {
        const canvas = qrcodeDiv.querySelector('canvas');
        if (!canvas) return;

        canvas.toBlob(blob => {
            navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]).then(() => {
                showNotification('Nusxa olindi!', 'success');
            }).catch(() => {
                showNotification('Nusxa olishda xatolik!', 'error');
            });
        });
    } catch (e) {
        console.error('Copy error:', e);
        showNotification('Nusxa olishda xatolik!', 'error');
    }
}

function shareQRCode() {
    try {
        const canvas = qrcodeDiv.querySelector('canvas');
        if (!canvas) return;

        canvas.toBlob(blob => {
            const file = new File([blob], 'qrcode.png', { type: 'image/png' });
            
            if (navigator.share) {
                navigator.share({
                    files: [file],
                    title: 'QR Code'
                }).catch(() => {
                    showNotification('Baham ko\'rishda xatolik!', 'error');
                });
            } else {
                downloadQRCode();
            }
        });
    } catch (e) {
        console.error('Share error:', e);
        showNotification('Baham ko\'rishda xatolik!', 'error');
    }
}

function exportHistory() {
    try {
        const history = getHistory();
        
        // Decrypt for export (warning in console)
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `qr-history-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        showNotification('Tarix yuklab olindi!', 'success');
    } catch (e) {
        console.error('Export error:', e);
        showNotification('Eksport qilishda xatolik!', 'error');
    }
}

// ========== EVENT LISTENERS ==========
generateBtn.addEventListener('click', () => generateQRCode(urlInput.value));
downloadBtn.addEventListener('click', downloadQRCode);
copyBtn.addEventListener('click', copyToClipboard);
shareBtn.addEventListener('click', shareQRCode);

clearHistoryBtn.addEventListener('click', function() {
    if (confirm('Haqiqatan ham barcha tarixni o\'chirmoqchisiz?')) {
        try {
            localStorage.removeItem(STORAGE_KEY);
            renderHistory();
            qrcodeDiv.innerHTML = '';
            qrActions.style.display = 'none';
            urlInput.value = '';
            currentURL = null;
            currentQRCode = null;
            showNotification('Tarix o\'chirildi!', 'success');
        } catch (e) {
            console.error('Clear history error:', e);
        }
    }
});

exportHistoryBtn.addEventListener('click', exportHistory);

// Input events with sanitization
urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        generateQRCode(this.value);
    }
});

urlInput.addEventListener('input', function() {
    clearInputBtn.style.display = this.value ? 'block' : 'none';
});

clearInputBtn.addEventListener('click', function() {
    urlInput.value = '';
    errorDiv.textContent = '';
    this.style.display = 'none';
    urlInput.focus();
});

searchHistory.addEventListener('input', renderHistory);

// Settings
settingsBtn.addEventListener('click', function() {
    qrSettings.style.display = qrSettings.style.display === 'none' ? 'grid' : 'none';
});

qrSize.addEventListener('input', function() {
    const size = parseInt(this.value);
    if (size >= 150 && size <= 400) {
        currentQRSize = size;
        sizeValue.textContent = size + 'px';
        if (currentURL) {
            generateQRCode(currentURL);
        }
    }
});

errorCorrection.addEventListener('change', function() {
    if (['L', 'M', 'Q', 'H'].includes(this.value)) {
        currentCorrectLevel = this.value;
        if (currentURL) {
            generateQRCode(currentURL);
        }
    }
});

// Prevent pinch zoom
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

// Prevent right-click context menu (optional)
document.addEventListener('contextmenu', function(e) {
    // Allow copy on input
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    try {
        detectMobile();
        initTheme();
        renderHistory();
    } catch (e) {
        console.error('Initialization error:', e);
    }
});

// ========== NOTIFICATION ==========
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ========== QR CODE GENERATION ==========
function generateQRCode(url) {
    // Show loading
    qrcodeDiv.innerHTML = '<div class="loading-spinner"></div>';
    errorDiv.textContent = '';
    qrActions.style.display = 'none';

    // Validate URL
    if (!url.trim()) {
        errorDiv.textContent = 'Iltimos, URL ni kiriting!';
        qrcodeDiv.innerHTML = '';
        return;
    }

    // Format URL
    let formattedURL = url;
    if (!url.match(/^https?:\/\//)) {
        formattedURL = 'https://' + url;
    }

    if (!isValidURL(formattedURL)) {
        errorDiv.textContent = 'Noto\'g\'ri URL format!';
        qrcodeDiv.innerHTML = '';
        return;
    }

    try {
        setTimeout(() => {
            qrcodeDiv.innerHTML = '';
            
            // Get correction level
            const correctionLevels = {
                'L': QRCode.CorrectLevel.L,
                'M': QRCode.CorrectLevel.M,
                'Q': QRCode.CorrectLevel.Q,
                'H': QRCode.CorrectLevel.H
            };

            currentQRCode = new QRCode({
                text: formattedURL,
                width: currentQRSize,
                height: currentQRSize,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: correctionLevels[currentCorrectLevel]
            });

            currentURL = formattedURL;
            qrActions.style.display = 'flex';
            addToHistory(formattedURL);
            showNotification('QR Code muvaffaqiyatli yaratildi!', 'success');
        }, 300);

    } catch (error) {
        errorDiv.textContent = 'Xatolik: ' + error.message;
        qrcodeDiv.innerHTML = '';
        qrActions.style.display = 'none';
        showNotification('QR Code yaratishda xatolik!', 'error');
    }
}

// ========== HISTORY MANAGEMENT ==========
function addToHistory(url) {
    let history = getHistory();
    
    const exists = history.some(item => item.url === url);
    
    if (!exists) {
        history.unshift({
            url: url,
            timestamp: new Date().toLocaleString('uz-UZ'),
            id: Date.now()
        });

        if (history.length > 50) {
            history = history.slice(0, 50);
        }

        saveHistory(history);
    }

    renderHistory();
}

function renderHistory() {
    const history = getHistory();
    let searchTerm = searchHistory.value.toLowerCase();
    
    filteredHistory = history.filter(item => 
        item.url.toLowerCase().includes(searchTerm)
    );

    if (filteredHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-message"><i class="fas fa-folder-open"></i> Saqlangan narsalar yo\'q</p>';
        return;
    }

    historyList.innerHTML = filteredHistory.map(item => `
        <div class="history-item">
            <div class="history-item-url">${escapeHtml(item.url)}</div>
            <div class="history-item-actions">
                <button class="btn-view" onclick="viewQRCode('${escapeHtml(item.url)}')" title="Ko'rish">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-delete" onclick="deleteFromHistory(${item.id})" title="O'chirish">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function viewQRCode(url) {
    urlInput.value = url;
    generateQRCode(url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteFromHistory(id) {
    let history = getHistory();
    history = history.filter(item => item.id !== id);
    saveHistory(history);
    renderHistory();
    showNotification('O\'chirildi', 'success');
}

// ========== FILE OPERATIONS ==========
function downloadQRCode() {
    if (!currentQRCode) return;

    const canvas = qrcodeDiv.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qrcode-${Date.now()}.png`;
    link.click();
    showNotification('QR Code yuklab olindi!', 'success');
}

function copyToClipboard() {
    const canvas = qrcodeDiv.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob(blob => {
        navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]).then(() => {
            showNotification('Nusxa olindi!', 'success');
        }).catch(() => {
            showNotification('Nusxa olishda xatolik!', 'error');
        });
    });
}

function shareQRCode() {
    const canvas = qrcodeDiv.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob(blob => {
        const file = new File([blob], 'qrcode.png', { type: 'image/png' });
        
        if (navigator.share) {
            navigator.share({
                files: [file],
                title: 'QR Code'
            }).catch(() => {
                showNotification('Baham ko\'rishda xatolik!', 'error');
            });
        } else {
            downloadQRCode();
        }
    });
}

function exportHistory() {
    const history = getHistory();
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `qr-history-${Date.now()}.json`;
    link.click();
    showNotification('Tarix yuklab olindi!', 'success');
}

// ========== TOUCH EVENTS ==========
let touchStartX = 0;
let touchEndX = 0;

function handleSwipe() {
    if (touchEndX < touchStartX - 50) {
        // Swiped left
        if (qrSettings.style.display !== 'none') {
            qrSettings.style.display = 'none';
        }
    }
    if (touchEndX > touchStartX + 50) {
        // Swiped right
        if (qrSettings.style.display === 'none') {
            qrSettings.style.display = 'grid';
        }
    }
}

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, false);

// ========== EVENT LISTENERS ==========
// Button events
generateBtn.addEventListener('click', () => generateQRCode(urlInput.value));
downloadBtn.addEventListener('click', downloadQRCode);
copyBtn.addEventListener('click', copyToClipboard);
shareBtn.addEventListener('click', shareQRCode);

clearHistoryBtn.addEventListener('click', function() {
    if (confirm('Haqiqatan ham barcha tarixni o\'chirmoqchisiz?')) {
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
        qrcodeDiv.innerHTML = '';
        qrActions.style.display = 'none';
        urlInput.value = '';
        currentURL = null;
        currentQRCode = null;
        showNotification('Tarix o\'chirildi!', 'success');
    }
});

exportHistoryBtn.addEventListener('click', exportHistory);

// Input events
urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        generateQRCode(this.value);
    }
});

urlInput.addEventListener('input', function() {
    clearInputBtn.style.display = this.value ? 'block' : 'none';
});

clearInputBtn.addEventListener('click', function() {
    urlInput.value = '';
    errorDiv.textContent = '';
    this.style.display = 'none';
    urlInput.focus();
});

searchHistory.addEventListener('input', renderHistory);

// Settings
settingsBtn.addEventListener('click', function() {
    qrSettings.style.display = qrSettings.style.display === 'none' ? 'grid' : 'none';
});

qrSize.addEventListener('input', function() {
    currentQRSize = parseInt(this.value);
    sizeValue.textContent = this.value + 'px';
    if (currentURL) {
        generateQRCode(currentURL);
    }
});

errorCorrection.addEventListener('change', function() {
    currentCorrectLevel = this.value;
    if (currentURL) {
        generateQRCode(currentURL);
    }
});

// Prevent pinch zoom
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    detectMobile();
    initTheme();
    renderHistory();
    
    // Add to home screen prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredPrompt = e;
    });
});

// ========== STORAGE FUNCTIONS ==========
function getHistory() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// ========== VALIDATION ==========
function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ========== NOTIFICATION ==========
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ========== QR CODE GENERATION ==========
function generateQRCode(url) {
    // Show loading
    qrcodeDiv.innerHTML = '<div class="loading-spinner"></div>';
    errorDiv.textContent = '';
    qrActions.style.display = 'none';

    // Validate URL
    if (!url.trim()) {
        errorDiv.textContent = 'Iltimos, URL ni kiriting!';
        qrcodeDiv.innerHTML = '';
        return;
    }

    // Format URL
    let formattedURL = url;
    if (!url.match(/^https?:\/\//)) {
        formattedURL = 'https://' + url;
    }

    if (!isValidURL(formattedURL)) {
        errorDiv.textContent = 'Noto\'g\'ri URL format!';
        qrcodeDiv.innerHTML = '';
        return;
    }

    try {
        setTimeout(() => {
            qrcodeDiv.innerHTML = '';
            
            // Get correction level
            const correctionLevels = {
                'L': QRCode.CorrectLevel.L,
                'M': QRCode.CorrectLevel.M,
                'Q': QRCode.CorrectLevel.Q,
                'H': QRCode.CorrectLevel.H
            };

            currentQRCode = new QRCode({
                text: formattedURL,
                width: currentQRSize,
                height: currentQRSize,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: correctionLevels[currentCorrectLevel]
            });

            currentURL = formattedURL;
            qrActions.style.display = 'flex';
            addToHistory(formattedURL);
            showNotification('QR Code muvaffaqiyatli yaratildi!', 'success');
        }, 300);

    } catch (error) {
        errorDiv.textContent = 'Xatolik: ' + error.message;
        qrcodeDiv.innerHTML = '';
        qrActions.style.display = 'none';
        showNotification('QR Code yaratishda xatolik!', 'error');
    }
}

// ========== HISTORY MANAGEMENT ==========
function addToHistory(url) {
    let history = getHistory();
    
    const exists = history.some(item => item.url === url);
    
    if (!exists) {
        history.unshift({
            url: url,
            timestamp: new Date().toLocaleString('uz-UZ'),
            id: Date.now()
        });

        if (history.length > 50) {
            history = history.slice(0, 50);
        }

        saveHistory(history);
    }

    renderHistory();
}

function renderHistory() {
    const history = getHistory();
    let searchTerm = searchHistory.value.toLowerCase();
    
    filteredHistory = history.filter(item => 
        item.url.toLowerCase().includes(searchTerm)
    );

    if (filteredHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-message"><i class="fas fa-folder-open"></i> Saqlangan narsalar yo\'q</p>';
        return;
    }

    historyList.innerHTML = filteredHistory.map(item => `
        <div class="history-item">
            <div class="history-item-url">${escapeHtml(item.url)}</div>
            <div class="history-item-actions">
                <button class="btn-view" onclick="viewQRCode('${escapeHtml(item.url)}')" title="Ko'rish">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-delete" onclick="deleteFromHistory(${item.id})" title="O'chirish">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function viewQRCode(url) {
    urlInput.value = url;
    generateQRCode(url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteFromHistory(id) {
    let history = getHistory();
    history = history.filter(item => item.id !== id);
    saveHistory(history);
    renderHistory();
    showNotification('O\'chirildi', 'success');
}

// ========== FILE OPERATIONS ==========
function downloadQRCode() {
    if (!currentQRCode) return;

    const canvas = qrcodeDiv.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qrcode-${Date.now()}.png`;
    link.click();
    showNotification('QR Code yuklab olindi!', 'success');
}

function copyToClipboard() {
    const canvas = qrcodeDiv.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob(blob => {
        navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]).then(() => {
            showNotification('Nusxa olindi!', 'success');
        }).catch(() => {
            showNotification('Nusxa olishda xatolik!', 'error');
        });
    });
}

function shareQRCode() {
    const canvas = qrcodeDiv.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob(blob => {
        const file = new File([blob], 'qrcode.png', { type: 'image/png' });
        
        if (navigator.share) {
            navigator.share({
                files: [file],
                title: 'QR Code'
            }).catch(() => {
                showNotification('Baham ko\'rishda xatolik!', 'error');
            });
        } else {
            downloadQRCode();
        }
    });
}

function exportHistory() {
    const history = getHistory();
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `qr-history-${Date.now()}.json`;
    link.click();
    showNotification('Tarix yuklab olindi!', 'success');
}

// ========== EVENT LISTENERS ==========
// Button events
generateBtn.addEventListener('click', () => generateQRCode(urlInput.value));
downloadBtn.addEventListener('click', downloadQRCode);
copyBtn.addEventListener('click', copyToClipboard);
shareBtn.addEventListener('click', shareQRCode);

clearHistoryBtn.addEventListener('click', function() {
    if (confirm('Haqiqatan ham barcha tarixni o\'chirmoqchisiz?')) {
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
        qrcodeDiv.innerHTML = '';
        qrActions.style.display = 'none';
        urlInput.value = '';
        currentURL = null;
        currentQRCode = null;
        showNotification('Tarix o\'chirildi!', 'success');
    }
});

exportHistoryBtn.addEventListener('click', exportHistory);

// Input events
urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        generateQRCode(this.value);
    }
});

urlInput.addEventListener('input', function() {
    clearInputBtn.style.display = this.value ? 'block' : 'none';
});

clearInputBtn.addEventListener('click', function() {
    urlInput.value = '';
    errorDiv.textContent = '';
    this.style.display = 'none';
    urlInput.focus();
});

searchHistory.addEventListener('input', renderHistory);

// Settings
settingsBtn.addEventListener('click', function() {
    qrSettings.style.display = qrSettings.style.display === 'none' ? 'grid' : 'none';
});

qrSize.addEventListener('input', function() {
    currentQRSize = parseInt(this.value);
    sizeValue.textContent = this.value + 'px';
    if (currentURL) {
        generateQRCode(currentURL);
    }
});

errorCorrection.addEventListener('change', function() {
    currentCorrectLevel = this.value;
    if (currentURL) {
        generateQRCode(currentURL);
    }
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    renderHistory();
});
