import CryptoJS from 'crypto-js';

// Generate a random user ID and encryption key on first load
const initializeCloudIdentity = () => {
  let userId = localStorage.getItem('cloud_user_id');
  let encryptionKey = localStorage.getItem('cloud_encryption_key');

  if (!userId || !encryptionKey) {
    userId = crypto.randomUUID();
    // Generate a strong random key for AES encryption
    encryptionKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
    
    localStorage.setItem('cloud_user_id', userId);
    localStorage.setItem('cloud_encryption_key', encryptionKey);
  }

  return { userId, encryptionKey };
};

export const syncToCloud = async (data: any, dataType: 'profile' | 'medicalId') => {
  try {
    const { userId, encryptionKey } = initializeCloudIdentity();
    
    // 1. Fetch existing cloud data to merge, or create new object
    let cloudData: any = {};
    try {
      const res = await fetch(`/api/cloud/sync/${userId}`);
      const json = await res.json();
      if (json.success && json.encryptedPayload) {
        const bytes = CryptoJS.AES.decrypt(json.encryptedPayload, encryptionKey);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        if (decryptedStr) {
          cloudData = JSON.parse(decryptedStr);
        }
      }
    } catch (e) {
      console.warn("Could not fetch existing cloud data, creating new.");
    }

    // 2. Update the specific data type
    cloudData[dataType] = data;

    // 3. Encrypt the entire payload
    // The server will only see this encrypted string, ensuring high security and zero tracking.
    const encryptedPayload = CryptoJS.AES.encrypt(JSON.stringify(cloudData), encryptionKey).toString();

    // 4. Send to secure cloud database
    const response = await fetch('/api/cloud/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        encryptedPayload
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Cloud sync failed:", error);
    return false;
  }
};

export const fetchFromCloud = async (dataType: 'profile' | 'medicalId') => {
  try {
    const { userId, encryptionKey } = initializeCloudIdentity();
    
    const response = await fetch(`/api/cloud/sync/${userId}`);
    const result = await response.json();
    
    if (result.success && result.encryptedPayload) {
      // Decrypt the payload locally
      const bytes = CryptoJS.AES.decrypt(result.encryptedPayload, encryptionKey);
      const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
      
      if (decryptedStr) {
        const cloudData = JSON.parse(decryptedStr);
        return cloudData[dataType] || null;
      }
    }
    return null;
  } catch (error) {
    console.error("Cloud fetch failed:", error);
    return null;
  }
};
