// ========== SIMPLE QR CODE TEST ==========
// Minimal working version to test QR code generation

console.log('QR Code app starting...');
console.log('QRCode available:', typeof QRCode);

// DOM Elements
const urlInput = document.getElementById('urlInput');
const generateBtn = document.getElementById('generateBtn');
const qrcodeDiv = document.getElementById('qrcode');
const errorDiv = document.getElementById('error');
const qrActions = document.getElementById('qrActions');
const downloadBtn = document.getElementById('downloadBtn');
const notification = document.getElementById('notification');

// Variables
let currentURL = '';

// Event Listeners
if (generateBtn) {
    generateBtn.addEventListener('click', generateQRCode);
}

if (urlInput) {
    urlInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            generateQRCode();
        }
    });
}

if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadQRCode);
}

// Generate QR Code
function generateQRCode() {
    console.log('Generate button clicked');
    
    const url = urlInput.value.trim();
    
    if (!url) {
        errorDiv.textContent = 'Iltimos, URL ni kiriting!';
        return;
    }

    // Format URL
    let formattedURL = url;
    if (!url.match(/^https?:\/\//)) {
        formattedURL = 'https://' + url;
    }

    try {
        console.log('Generating QR for:', formattedURL);
        
        // Clear previous
        errorDiv.textContent = '';
        qrcodeDiv.innerHTML = '';

        // Generate QR Code
        if (typeof QRCode === 'undefined') {
            errorDiv.textContent = 'QRCode library not loaded!';
            console.error('QRCode is undefined');
            return;
        }

        new QRCode({
            text: formattedURL,
            element: qrcodeDiv,
            width: 250,
            colorDark: '#000000',
            colorLight: '#ffffff'
        });

        currentURL = formattedURL;
        
        if (qrActions) {
            qrActions.style.display = 'flex';
        }
        
        showNotification('QR Code muvaffaqiyatli yaratildi!', 'success');
        console.log('QR Code generated successfully');
        
    } catch (error) {
        console.error('Error generating QR:', error);
        errorDiv.textContent = 'Xatolik: ' + error.message;
        qrActions.style.display = 'none';
        showNotification('QR Code yaratishda xatolik!', 'error');
    }
}

// Download QR Code
function downloadQRCode() {
    if (!currentURL) {
        showNotification('Avval QR Code yarating!', 'error');
        return;
    }

    const canvas = qrcodeDiv.querySelector('canvas');
    if (!canvas) {
        showNotification('QR Code topilmadi!', 'error');
        return;
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'qrcode.png';
    link.click();
    
    showNotification('QR Code yuklab olindi!', 'success');
}

// Show Notification
function showNotification(message, type) {
    const notif = document.getElementById('notification');
    if (!notif) return;
    
    notif.textContent = message;
    notif.className = 'notification ' + type;
    notif.style.display = 'block';
    
    setTimeout(() => {
        notif.style.display = 'none';
    }, 3000);
}

// Log when page loads
console.log('QR Code app loaded successfully');
console.log('QRCode.CorrectLevel:', typeof QRCode !== 'undefined' ? QRCode.CorrectLevel : 'undefined');
