const QRcode = require('qrcode')

const url = 'http://172.16.2.5:3000/attendance-sign-in.html'

QRcode.toFile('attendance-qr.png', url, {
    color: {
        dark: '#000000',
        light: '#ffffff'
    }
}, function (err) {
    if (err) throw err;
    console.log('QR code generated: attendance-qr.png')
})
