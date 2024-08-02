// import { ImageAnnotatorClient } from '@google-cloud/vision';
import vision from '@google-cloud/vision';

// const vision = require('@google-cloud/vision');

// Enter your service account details here
const credentials = JSON.parse(JSON.stringify({
    "type": "service_account",
    "project_id": "calcium-adapter-427811-n8",
    "private_key_id": "5f30a32edb34b20d7793b8180d7ae16d984bd7e6",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDIOQPt9sBotk+z\nDBBmN77yzsl4D+NymbqXKeJzNV6YdEYJlteO6SF+33M/fipQg5oMpIXQXGAVt2jZ\n1uo36PbAIWQVOspIW4wUuujOF0q3uIxnPj/CYgggl4yhsv5UCHzAWct5tVl7f0FA\n7aKerk25cV9PeT9Amc4WuKuHpBmMUyAS6YqitQ+n/JjeEBaRbXH8B4fDhgQIry7M\nCYr0MXyFNYRsWHeynukY/+T0QlIAQDaNIpHX1wFyEDrcLSapsHD1qZOmUJfYSrPD\nen5z2eX4B05sKh0aRwZxiHfqGKwZD8DlvjL/wdfJIWCmiAFDBcQBML1dPwHg66nX\nKwHkFP+PAgMBAAECggEAFy9Jo12zebdECFVzyq+sK/KXsBBARANwG1P4IGNu25Qk\njgoKVkaW9dmLFLBCgcXovzZdNmY+oWp2Y484L5be3Rr2ELfuN4MToqI4FgaVb4EZ\nD6rMzZtLb0wNNqYtlBkoKkqGPhwqoJsjjmYAstjihYA5dfryFkQZHKwaqgoYWUAM\nT/4y6qrdJ2yN7G3qP/tHyXSjgmay08/Mf90xBK9Yr5zQKKSkuAVQm4YS+umZhu5a\neicdMA01inB28g8/wb7iPUbOXgLSO0idnBeQz8/SlgI7g7ig4gFfiKGDqE9g9iCZ\nHNYX2xWFP4i4h9ZzmECse3F5bkBxXhfvfMq31D52BQKBgQD01rk8/ThH3ctpT2CP\nEkRwqPLFDGeawvKWJp7tv+mNtZ+x1Glfvtj8X7iqj7MAVxFjwW+kRtp6F/8YgN/I\n3JnxrQ6t6sMYRteVmJEEo0PusI8NhrAzmnbR0tmGJ2MfUhW4AamcQJ1GpkD1Ndt4\nimTfRNQw+RnoWWfxk3CAiGm8ywKBgQDRWZ77MzGMg/Zuqw47FmvhAsfFIx23s/3F\nSv4EjUOV5roFZHUPh7YjeqamSm4qlbppSCgYrZt++xhNB3BpJxiZtthzeKQbzugS\nIP/mms9EJbPmT7/pa/JcE7W4g8FO51ediRC8mekZlmeVR38yuhesZu0z/WVnTSUW\nk5eJQjlTzQKBgQCEdLHsE9Xh01TbWS0U2b4a8Nu9zLM0H6lbn/M1DjENECgf7ZlA\nSiBbkHF4HJurYG8w95ItXoONr/O6zuXCZc4G2Cfr4OjA9nplHQ+/YZA7zlrl52rl\nz/feFeLGWAKhDChhzsxykuZDNWhJAGUGdmCSBUuCXxEsCUpZf/lKIAKMNwKBgQCm\n4k10q/ucqvmAgQWIHriCl2fOg87FyUrLwps53653yYSSleEnLyUHpVdBimXFtrPy\nB15HReWF1P4rMXnvqQXYS0TCz/HqZQbkpL+6AcCl73Q4bWxr0+xQcDnVS9qGXq6e\nW0wnPH3wMtCB1IvWUThb63S9lAsIzRt6os8S0OLIJQKBgQCOYQI512JjqLIfggsh\nuNABgMDGw5gvqJTFr2APF5nWvRIXWWi7Nrr9Adj8kYEFLVqCa8UDGkj6BM5nZiTf\nVaqxA/QuDV17XVm2ZW7IzXBpNWySTkqy4qA6F9dNWMr7MfWrls5ASv1QJAbe3/PR\nkQSXwN3+vslDZByapmfl5N/Tgg==\n-----END PRIVATE KEY-----\n",
    "client_email": "imagetotext@calcium-adapter-427811-n8.iam.gserviceaccount.com",
    "client_id": "112981529753038417080",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/imagetotext%40calcium-adapter-427811-n8.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
}));

const config = {
    credentials: {
        private_key: credentials.private_key,
        client_email: credentials.client_email
    }
};

const client = new vision.ImageAnnotatorClient(config);

export const detectText = async (filePath) => {
    let [result] = await client.textDetection(filePath);
    const text = result?.fullTextAnnotation.text;

    if (!text) {
        console.log("No text detected");
        return [];
    }

    const regexPatterns = [
        /UTR\s*[:\-]?\s*(\w+)/gi,               // PhonePe
        /UPI\s*Ref\s*No\s*[:\-]?\s*([A-Z0-9]+)/gi, // Paytm
        /UPI\s*transaction\s*ID\s*[:\-]?\s*([A-Z0-9]+)/gi, // GPay
        /UPI\/CR\/(\d{12})/gi,                    // Bank with global flag for multiple matches
        /\b\d{12}\b/g                             // Generic 12-digit UTR pattern
    ];

    const utrNumbers = [];
    regexPatterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            utrNumbers.push(match[1]);
        }
    });

    // Remove undefined values
    const filteredUtrNumbers = utrNumbers.filter(Boolean);

    console.log("🚀 ~ detectText ~ UTR Numbers:", filteredUtrNumbers);
    return filteredUtrNumbers;
}
