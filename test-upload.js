import fs from 'fs';

async function testUpload() {
  const fileData = fs.readFileSync('package.json');
  const blob = new Blob([fileData], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, 'package.json');
  formData.append('isEncrypted', 'false');

  try {
    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.text();
    console.log("Status:", res.status, "Body:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

testUpload();
