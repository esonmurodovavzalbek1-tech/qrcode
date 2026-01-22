// ========== SIMPLE QR CODE TEST ==========
// Uses QR Server API - reliable and works everywhere

console.log('QR Code app starting...');

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
let currentQRImage = null;

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

// Generate QR Code using QR Server API
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
        qrcodeDiv.innerHTML = '<div class="loading-spinner"></div>';

        // Use QR Server API
        const encodedURL = encodeURIComponent(formattedURL);
        const qrImageURL = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedURL}`;

        // Create image element
        const img = document.createElement('img');
        img.src = qrImageURL;
        img.alt = 'QR Code';
        img.style.maxWidth = '250px';
        img.style.maxHeight = '250px';
        img.style.border = 'none';

        // Handle image load
        img.onload = function() {
            qrcodeDiv.innerHTML = '';
            qrcodeDiv.appendChild(img);
            
            currentURL = formattedURL;
            currentQRImage = img;
            
            if (qrActions) {
                qrActions.style.display = 'flex';
            }
            
            showNotification('QR Code muvaffaqiyatli yaratildi!', 'success');
            console.log('QR Code generated successfully');
        };

        // Handle image error
        img.onerror = function() {
            qrcodeDiv.innerHTML = '';
            errorDiv.textContent = 'QR Code yaratishda xatolik!';
            qrActions.style.display = 'none';
            showNotification('QR Code yaratishda xatolik!', 'error');
            console.error('Failed to load QR image');
        };

    } catch (error) {
        console.error('Error generating QR:', error);
        qrcodeDiv.innerHTML = '';
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

    if (!currentQRImage) {
        showNotification('QR Code topilmadi!', 'error');
        return;
    }

    try {
        // Create a link and download
        const link = document.createElement('a');
        link.href = currentQRImage.src;
        link.download = 'qrcode.png';
        link.click();
        
        showNotification('QR Code yuklab olindi!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Yuklab olishda xatolik!', 'error');
    }
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

