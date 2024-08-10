import vision from '@google-cloud/vision';
import config from '../../config.js';

// Enter your service account details here
const credentials = JSON.parse(JSON.stringify({
    "private_key": `${config?.ocrPrivateKey}`,
    "client_email": `${config?.clientEmail}`,
   
}));

const configCred = {
    credentials: {
        private_key: credentials.private_key,
        client_email: credentials.client_email
    }
};

const client = new vision.ImageAnnotatorClient(configCred);

export const detectText = async (filePath) => {
    let [result] = await client.textDetection(filePath);
    const text = result?.fullTextAnnotation.text;

    if (!text) {
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
    return filteredUtrNumbers;
}


export const detectUtrAmountText = async (filePath) => {
    let [result] = await client.textDetection(`public/Images/${filePath}`);
    const text = result?.fullTextAnnotation?.text;
    const extractedData = {};


    if (!text) {
        return {};
    }

    // Define regex patterns for UTR numbers
    const regexPatterns = [
        /UTR\s*[:\-]?\s*(\w+)/gi,               // PhonePe
        /UPI\s*Ref\s*No\s*[:\-]?\s*([A-Z0-9]+)/gi, // Paytm
        /UPI\s*transaction\s*ID\s*[:\-]?\s*([A-Z0-9]+)/gi, // GPay
        /UPI\/CR\/(\d{12})/gi,                    // Bank with global flag for multiple matches
        /\b\d{12}\b/g,                             // Generic 12-digit UTR pattern
        /UPI\s*Transaction\s*ID\s*[:\-]?\s*(\w+)/ig,
        /(?<!RRN\s*)\b\d{12}\b/g,
        /UPI\s*Ref\.\s*No:\s*(\d{7}\s\d{5})/g
        
    ];

    // Define regex patterns for Amounts
    const amountPatterns = [
        /₹\s*\d{1,3}(,\d{3})*/g,                
        /Rs\s*\d{1,3}(,\d{3})*/g,                  
        /INR\s*\d{1,3}(,\d{3})*/g,
        // /\b\d{1,3}(,\d{3})*\b/g,
        /₹\s*\d{1,3}(,\d{3})*(\.\d{1,2})?/g,                  
        /₹\s*\d+(\.\d{1,2})?/g,
        /^\d{1,3}(?:,\d{3})$/g,
        /\b\d{1,3}(?:,\d{3})+\b/g,
        /Money Sent Successfully\s*(₹\s*\d+(\.\d{1,2})?)/gi,
        /Money Sent Successfully\s*₹\s*(\d+(\.\d{1,2})?)/gi,  
        /₹(\d+)\s*(.*)/,
        /₹(.*?)\s*Only/,
        // /\b\d{3,4}\b/g,
        // /\b\d{3,4}\b(?!(?:[^a-zA-Z0-9]*\b(?:bank|am|pm)\b))/g
 
    ];

    // Extract UTR numbers
    const utrNumbers = [];
    regexPatterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            utrNumbers.push(match[1]);
        }
    });

    // Remove undefined values
    const filteredUtrNumbers = utrNumbers.filter(Boolean);
    if (filteredUtrNumbers.length > 0) {
        extractedData.utr = filteredUtrNumbers[0];
    }

    // Extract amounts
    const extractedAmounts = [];
    amountPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            extractedAmounts.push(...matches);
        }
    });

    if (extractedAmounts.length > 0) {
        // Clean up any currency symbols
        extractedData.amount = extractedAmounts[0].replace(/₹\s*|Rs\s*|INR\s*|,/g, '');
    }
    return extractedData;
}

