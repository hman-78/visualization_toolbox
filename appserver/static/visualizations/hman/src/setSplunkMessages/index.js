const _setSplunkMessages = function (type="info", message) {
    // Create toast container
    const $toast = $('<div class="viz-toast ' + type + '"></div>');

    // Create message span
    const $text = $('<span class="viz-toast-text"></span>').text(message);

    // Create close button
    const $close = $('<button class="viz-toast-close">&times;</button>');

    // Assemble
    $toast.append($text).append($close);

    // Apply styles
    $toast.css({
        position: 'fixed',
        top: '120px',
        left: '50%',
        transform: 'translateX(-50%)',   // Center horizontally
        background: type === 'error' ? '#d9534f' : '#333',
        color: '#fff',
        padding: '12px 18px',
        borderRadius: '6px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        zIndex: 999999,                   // On top of everything
        opacity: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '80%',
        textAlign: 'center'
    });

    $close.css({
        background: 'transparent',
        border: 'none',
        color: '#fff',
        fontSize: '18px',
        cursor: 'pointer',
        marginLeft: '10px'
    });

    // Add to DOM
    $('body').append($toast);
    $toast.animate({ opacity: 1 }, 200);

    // Auto-remove after 3s
    const autoRemove = setTimeout(() => {
        $toast.fadeOut(10000, () => $toast.remove());
    }, 3000);

    // Manual close
    $close.on('click', () => {
        clearTimeout(autoRemove);
        $toast.fadeOut(200, () => $toast.remove());
    });
}

module.exports = _setSplunkMessages;