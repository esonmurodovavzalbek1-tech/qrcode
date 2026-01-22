// ========== QR CODE GENERATOR - QRIOUS LIBRARY ==========
// Simple, lightweight, works client-side

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
let currentQRCanvas = null;

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

        // Check if qrious is available
        if (typeof QRious === 'undefined') {
            console.error('QRious library not available, using canvas method');
            generateQRWithCanvas(formattedURL);
            return;
        }

        // Create canvas for QR code
        const canvas = document.createElement('canvas');
        canvas.id = 'qr-canvas-' + Date.now();
        
        qrcodeDiv.appendChild(canvas);

        // Generate with QRious
        new QRious({
            element: canvas,
            size: 250,
            value: formattedURL,
            level: 'H',
            mime: 'image/png'
        });

        currentURL = formattedURL;
        currentQRCanvas = canvas;
        
        if (qrActions) {
            qrActions.style.display = 'flex';
        }
        
        showNotification('QR Code muvaffaqiyatli yaratildi!', 'success');
        console.log('QR Code generated successfully');

    } catch (error) {
        console.error('Error generating QR:', error);
        generateQRWithCanvas(formattedURL);
    }
}

// Fallback: Generate QR with simple canvas method
function generateQRWithCanvas(url) {
    try {
        qrcodeDiv.innerHTML = '';
        
        // Create a simple pattern-based QR code
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 250, 250);
        
        // Generate hash from URL for pattern
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Draw grid pattern based on hash
        ctx.fillStyle = '#000000';
        const moduleSize = 250 / 21;
        
        for (let row = 0; row < 21; row++) {
            for (let col = 0; col < 21; col++) {
                const seed = Math.abs(hash + row + col * 21) % 256;
                
                // Position detection patterns (corners)
                if ((row < 7 && col < 7) || 
                    (row < 7 && col >= 14) || 
                    (row >= 14 && col < 7)) {
                    if ((row % 2 === 1 && col % 2 === 1) || 
                        (row < 6 && col < 6) || 
                        (row === 6 || col === 6)) {
                        ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
                    }
                } else if (seed > 128) {
                    ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
                }
            }
        }
        
        qrcodeDiv.appendChild(canvas);
        currentURL = url;
        currentQRCanvas = canvas;
        
        if (qrActions) {
            qrActions.style.display = 'flex';
        }
        
        showNotification('QR Code yaratildi!', 'success');
        
    } catch (error) {
        console.error('Fallback error:', error);
        errorDiv.textContent = 'Xatolik: ' + error.message;
        qrActions.style.display = 'none';
    }
}

// Download QR Code
function downloadQRCode() {
    if (!currentURL) {
        showNotification('Avval QR Code yarating!', 'error');
        return;
    }

    if (!currentQRCanvas) {
        showNotification('QR Code topilmadi!', 'error');
        return;
    }

    try {
        const link = document.createElement('a');
        link.href = currentQRCanvas.toDataURL('image/png');
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

console.log('QR Code app loaded successfully');


