// Amiri Arabic Font for jsPDF - Base64 encoded
// This is a subset of Amiri Regular font optimized for Arabic text

export const loadArabicFont = async (): Promise<string> => {
  // Load Amiri font from Google Fonts CDN
  const fontUrl = 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf';
  
  try {
    const response = await fetch(fontUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    return base64;
  } catch (error) {
    console.error('Failed to load Arabic font:', error);
    throw error;
  }
};

// Alternative: Use Cairo font which is also excellent for Arabic
export const loadCairoFont = async (): Promise<string> => {
  const fontUrl = 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1ToLQ-HmkA.ttf';
  
  try {
    const response = await fetch(fontUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    return base64;
  } catch (error) {
    console.error('Failed to load Cairo font:', error);
    throw error;
  }
};
